import { getShopToken } from "./sessions.js";

/** App Proxy signature validation (Shopify App Proxy) */
export function verifyAppProxySignature(query) {
  // App Proxy usa normalmente "signature"
  const signature = (query.signature || "").toString();
  if (!signature) return false;

  // concatena todos os params exceto signature, ordenados
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

/** Toggle helper */
export function toggleCollection(current = [], collectionGid) {
  const set = new Set(Array.isArray(current) ? current : []);
  if (set.has(collectionGid)) set.delete(collectionGid);
  else set.add(collectionGid);
  return Array.from(set);
}

/** Read favorites metafield (custom.garagem) from a customer */
export async function getFavorites(shop, customerId) {
  const token = await getShopToken(shop);
  if (!token) throw new Error("Shop not installed (missing token)");

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
    // se houver lixo no metafield, não rebenta o endpoint
    return [];
  }
}

/** Save favorites metafield (custom.garagem) into a customer */
export async function saveFavorites(shop, customerId, favorites) {
  const token = await getShopToken(shop);
  if (!token) throw new Error("Shop not installed (missing token)");

  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id key namespace value }
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
        type: "json",
        value: JSON.stringify(favorites || []),
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
