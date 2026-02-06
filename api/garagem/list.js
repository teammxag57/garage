import crypto from "crypto";
import { getShopToken } from "../../lib/sessions.js";
import { shopifyGraphQL } from "../../lib/shopify.js";

function verifyAppProxySignature(query, secret) {
  // App Proxy costuma enviar `signature`
  const signature = query.signature;
  if (!signature) return false;

  // cria mensagem com TODOS os params exceto signature
  const msg = Object.keys(query)
    .filter((k) => k !== "signature")
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k][0] : query[k]}`)
    .join("");

  const digest = crypto.createHmac("sha256", secret).update(msg).digest("hex");

  // timing-safe compare
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  try {
    // Vercel preenche req.query, mas fazemos fallback só para garantir
    const url = new URL(req.url, `https://${req.headers.host}`);
    const query = req.query ?? Object.fromEntries(url.searchParams.entries());

    const shop =
      query.shop ||
      req.headers["x-shopify-shop-domain"] ||
      req.headers["x-shopify-shop"]; // fallback

    const customerId =
      query.logged_in_customer_id ||
      query.customerId || // opcional (para testes)
      url.searchParams.get("logged_in_customer_id") ||
      url.searchParams.get("customerId");

    if (!shop || !customerId) {
      return res.status(400).json({ error: "Missing shop/customerId" });
    }

    // (Recomendado) Valida chamada App Proxy
    // Se isto NÃO for App Proxy, podes comentar este bloco.
    const secret = process.env.SHOPIFY_API_SECRET;
    if (secret) {
      const ok = verifyAppProxySignature(query, secret);
      if (!ok) return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const token = await getShopToken(shop);
    if (!token) {
      return res.status(401).json({
        error: "Shop not installed (missing token). Run /api/auth?shop=...",
      });
    }

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

    const value = data?.customer?.metafield?.value;
    const favorites = value ? JSON.parse(value) : [];

    return res.json({ success: true, favorites });
  } catch (e) {
    console.error("LIST ERROR:", e);
    return res.status(500).json({
      error: "Server error",
      detail: String(e?.stack || e?.message || e),
    });
  }
}
