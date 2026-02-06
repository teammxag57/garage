import crypto from "crypto";

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;

export function assertEnv() {
  if (!API_KEY || !API_SECRET || !process.env.SHOPIFY_APP_URL) {
    throw new Error("Missing SHOPIFY_API_KEY/SHOPIFY_API_SECRET/SHOPIFY_APP_URL");
  }
}

export function verifyHmacFromQuery(query) {
  // Shopify envia hmac no querystring. Temos de recomputar.
  const { hmac, ...rest } = query;
  if (!hmac) return false;

  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(",") : rest[k]}`)
    .join("&");

  const digest = crypto
    .createHmac("sha256", API_SECRET)
    .update(message)
    .digest("hex");

  return digest === hmac;
}

export function buildAuthUrl(shop, state) {
  assertEnv();
  const scopes = process.env.SCOPES || "read_customers,write_customers";
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth-callback`;

  const u = new URL(`https://${shop}/admin/oauth/authorize`);
  u.searchParams.set("client_id", API_KEY);
  u.searchParams.set("scope", scopes);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  // u.searchParams.set("grant_options[]", "per-user"); // opcional
  return u.toString();
}

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

export async function shopifyGraphQL(shop, accessToken, query, variables = {}) {
  const resp = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
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
