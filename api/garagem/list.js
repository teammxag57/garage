// /api/list.js
import crypto from "crypto";
import { getShopToken } from "../../lib/sessions.js";
import { shopifyGraphQL } from "../../lib/shopify.js";

/**
 * Verifica a assinatura do App Proxy.
 * Shopify assina todos os params (exceto `signature`) concatenados,
 * por ordem alfabética, no formato key=value (sem &), com HMAC-SHA256.
 */
function verifyAppProxySignature(query, secret) {
  const signature = query.signature;
  if (!signature) return false;

  const msg = Object.keys(query)
    .filter((k) => k !== "signature")
    .sort()
    .map((k) => {
      const v = Array.isArray(query[k]) ? query[k][0] : query[k];
      return `${k}=${v}`;
    })
    .join("");

  const digest = crypto.createHmac("sha256", secret).update(msg).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Anti-cache (evita “piscar”/estado errado após refresh)
    res.setHeader("Cache-Control", "no-store");

    // Normaliza query (Vercel/Next) + fallback
    const url = new URL(req.url, `https://${req.headers.host}`);
    const query = req.query ?? Object.fromEntries(url.searchParams.entries());

    const shop = String(
      query.shop ||
        req.headers["x-shopify-shop-domain"] ||
        req.headers["x-shopify-shop"] ||
        ""
    ).trim();

    const customerId = String(
      query.logged_in_customer_id ||
        query.customerId || // opcional (testes)
        url.searchParams.get("logged_in_customer_id") ||
        url.searchParams.get("customerId") ||
        ""
    ).trim();

    if (!shop || !customerId) {
      return res.status(400).json({ error: "Missing shop/customerId" });
    }

    // Validação App Proxy (recomendado em produção)
    const secret = process.env.SHOPIFY_API_SECRET;
    if (secret && query.signature) {
      const ok = verifyAppProxySignature(query, secret);
      if (!ok) return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const token = await getShopToken(shop);
    if (!token) {
      return res.status(401).json({
        error: "Shop not installed (missing token). Run /api/auth?shop=...",
      });
    }

    // Lê SEMPRE o mesmo metafield que o toggle deve usar: custom.garagem
    const q = `
      query($id: ID!) {
        customer(id: $id) {
          metafield(namespace: "custom", key: "garagem") { value }
        }
      }
    `;

    const data = await shopifyGraphQL(shop, token, q, {
      id: `gid://shopify/Customer/${customerId}`,
    });

    const rawValue = data?.customer?.metafield?.value;

    // Robustez: se não for JSON válido, devolve vazio
    let favorites = [];
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue);
        favorites = Array.isArray(parsed) ? parsed : [];
      } catch {
        favorites = [];
      }
    }

    // Normaliza para strings trimmed (evita includes falhar por espaços/tipos)
    favorites = favorites
      .map((x) => String(x).trim())
      .filter(Boolean);

    return res.json({ success: true, favorites });
  } catch (e) {
    console.error("LIST ERROR:", e);
    return res.status(500).json({
      error: "Server error",
      detail: String(e?.stack || e?.message || e),
    });
  }
}
