import crypto from "crypto";

const SHOP = process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const NS = process.env.FAVORITES_NAMESPACE || "garage";
const KEY = process.env.FAVORITES_KEY || "favorite_collections";

// --- (Opcional) validar assinatura do App Proxy ---
// Shopify App Proxy pode enviar "signature" no querystring.
// Isto protege contra chamadas externas sem passar pela Shopify.
export function verifyAppProxySignature(query) {
  const secret = process.env.APP_PROXY_SECRET;
  if (!secret) return true; // se não definires secret, não valida

  const { signature, ...rest } = query;
  if (!signature) return false;

  // Ordena e cria string query sem signature
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`)
    .join("");

  const digest = crypto.createHmac("sha256", secret).update(message).digest("hex");
  return digest === signature;
}

async function shopifyGraphQL(query, variables = {}) {
  if (!SHOP || !TOKEN) throw new Error("Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN");

  const resp = await fetch(`https://${SHOP}/admin/api/2025-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await resp.json();
  if (!resp.ok || json.errors) {
    throw new Error(JSON.stringify({ status: resp.status, errors: json.errors, json }, null, 2));
  }
  return json.data;
}

export async function getFavorites(customerIdNumeric) {
  // customerIdNumeric vem do App Proxy: logged_in_customer_id (numérico)
  const customerGid = `gid://shopify/Customer/${customerIdNumeric}`;

  const q = `
    query GetCustomerMetafield($id: ID!, $ns: String!, $key: String!) {
      customer(id: $id) {
        id
        metafield(namespace: $ns, key: $key) {
          id
          type
          value
        }
      }
    }
  `;

  const data = await shopifyGraphQL(q, { id: customerGid, ns: NS, key: KEY });
  const mf = data?.customer?.metafield;

  // Se guardares como JSON (type: json), devolve array
  if (!mf?.value) return [];
  try {
    const parsed = JSON.parse(mf.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(customerIdNumeric, favoritesArray) {
  const customerGid = `gid://shopify/Customer/${customerIdNumeric}`;

  const m = `
    mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;

  const metafields = [
    {
      ownerId: customerGid,
      namespace: NS,
      key: KEY,
      type: "json",
      value: JSON.stringify(favoritesArray),
    },
  ];

  const data = await shopifyGraphQL(m, { metafields });
  const errs = data?.metafieldsSet?.userErrors || [];
  if (errs.length) throw new Error(`metafieldsSet userErrors: ${JSON.stringify(errs)}`);
  return data.metafieldsSet.metafields?.[0];
}

export function toggleCollection(currentList, collectionGid) {
  const set = new Set(currentList || []);
  if (set.has(collectionGid)) set.delete(collectionGid);
  else set.add(collectionGid);
  return Array.from(set);
}
