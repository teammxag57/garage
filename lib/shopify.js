import crypto from "crypto";

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;

/**
 * Admin API version (fallback sensato)
 * Podes definir SHOPIFY_ADMIN_API_VERSION="2026-01" no Vercel.
 */
const ADMIN_API_VERSION = process.env.SHOPIFY_ADMIN_API_VERSION || "2026-01";

export function assertEnv() {
  if (!API_KEY || !API_SECRET || !process.env.SHOPIFY_APP_URL) {
    throw new Error("Missing SHOPIFY_API_KEY/SHOPIFY_API_SECRET/SHOPIFY_APP_URL");
  }
}

/**
 * HMAC validation (OAuth/Admin redirects)
 * Shopify envia `hmac` nos redirects OAuth e em chamadas do Admin.
 */
export function verifyHmacFromQuery(query) {
  const hmac = (query.hmac || "").toString();
  if (!hmac) return false;

  // Remove hmac/signature do cálculo
  const { hmac: _hmac, signature: _signature, ...rest } = query;

  const message = Object.keys(rest)
    .sort()
    .map((k) => {
      const v = rest[k];
      if (Array.isArray(v)) return `${k}=${v.join(",")}`;
      return `${k}=${v}`;
    })
    .join("&");

  const digest = crypto.createHmac("sha256", API_SECRET).update(message).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

/**
 * Build OAuth authorize URL
 */
export function buildAuthUrl(shop, state) {
  assertEnv();

  const scopes = process.env.SCOPES || "read_customers,write_customers";
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth-callback`;

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", API_KEY);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCodeForToken(shop, code) {
  assertEnv();

  const resp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: API_KEY,
      client_secret: API_SECRET,
      code,
    }),
  });

  const json = await resp.json();
  if (!resp.ok || !json.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/**
 * Shopify Admin GraphQL helper
 */
export async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
  const resp = await fetch(`https://${shop}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await resp.json();
  if (!resp.ok || json.errors) {
    throw new Error(JSON.stringify({ status: resp.status, json }, null, 2));
  }
  return json.data;
}

/**
 * App Proxy signature validation
 * Shopify App Proxy envia `signature` (não `hmac`).
 */
export function verifyAppProxySignature(query) {
  const signature = (query.signature || "").toString();
  if (!signature) return false;

  // Concatena todos os params exceto signature, ordenados
  const msg = Object.keys(query)
    .filter((k) => k !== "signature")
    .sort()
    .map((k) => `${k}=${Array.isArray(query[k]) ? query[k][0] : query[k]}`)
    .join("");

  const digest = crypto.createHmac("sha256", API_SECRET).update(msg).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/**
 * Favorites helpers
 */
export function toggleCollection(current = [], collectionGid) {
  const set = new Set(Array.isArray(current) ? current : []);
  if (set.has(collectionGid)) set.delete(collectionGid);
  else set.add(collectionGid);
  return Array.from(set);
}

/**
 * Read favorites from customer metafield custom.garagem
 * Uses lazy import to avoid circular dependency with sessions.js
 */
export async function getFavorites(shop, customerId) {
  const { getShopToken } = await import("./sessions.js");
  const token = await getShopToken(shop);
  if (!token) throw new Error("Shop not installed (missing token). Run /api/auth?shop=...");

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
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save favorites into customer metafield custom.garagem
 */
export async function saveFavorites(shop, customerId, favorites) {
  const { getShopToken } = await import("./sessions.js");
  const token = await getShopToken(shop);
  if (!token) throw new Error("Shop not installed (missing token). Run /api/auth?shop=...");

  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: `gid://shopify/Customer/${customerId}`,
        namespace: "custom",
        key: "garagem",
        // guardamos como JSON (lista de GIDs)
        type: "json",
        value: JSON.stringify(Array.isArray(favorites) ? favorites : []),
      },
    ],
  };

  const data = await shopifyGraphQL(shop, token, mutation, variables);

  const errs = data?.metafieldsSet?.userErrors || [];
  if (errs.length) {
    throw new Error(`metafieldsSet userErrors: ${JSON.stringify(errs)}`);
  }

  return true;
}
