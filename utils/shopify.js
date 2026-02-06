import fetch from "node-fetch";

// Chamada genérica Admin API
export async function shopifyFetch(query) {
  const res = await fetch(`https://${process.env.SHOP}.myshopify.com/admin/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": process.env.ADMIN_TOKEN,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  return res.json();
}

// Ler o metafield do cliente
export async function getFavorites(customerId) {
  const query = `
    query {
      customer(id: "gid://shopify/Customer/${customerId}") {
        metafield(namespace: "custom", key: "garagem") {
          value
        }
      }
    }
  `;
  const res = await shopifyFetch(query);
  const value = res.data.customer.metafield?.value;
  return value ? JSON.parse(value) : [];
}

// Salvar lista atualizada
export async function saveFavorites(customerId, favorites) {
  const mutation = `
    mutation {
      metafieldsSet(metafields: [{
        ownerId: "gid://shopify/Customer/${customerId}",
        namespace: "custom",
        key: "garagem",
        type: "list.collection_reference",
        value: ${JSON.stringify(JSON.stringify(favorites))}
      }]) {
        userErrors { message }
      }
    }
  `;
  await shopifyFetch(mutation);
}

// Toggle
export function toggleCollection(favorites, collectionGid) {
  if (favorites.includes(collectionGid)) return favorites.filter(id => id !== collectionGid);
  return [...favorites, collectionGid];
}
