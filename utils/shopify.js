import fetch from "node-fetch";

// Configuração
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = "2024-10";

/**
 * Buscar metafield "garagem" de um cliente
 */
export async function getFavorites(customerId) {
  try {
    console.log("🔍 getFavorites - customerId:", customerId);
    
    if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
      throw new Error("SHOPIFY_STORE ou SHOPIFY_ADMIN_TOKEN não configurados");
    }

    const numericId = customerId.replace("gid://shopify/Customer/", "");
    const url = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/customers/${numericId}/metafields.json`;
    
    console.log("📡 Fetching:", url);

    const response = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Shopify API Error:", response.status, errorText);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    const metafields = data.metafields || [];

    const garagemMetafield = metafields.find(
      (mf) => mf.namespace === "custom" && mf.key === "garagem"
    );

    if (!garagemMetafield || !garagemMetafield.value) {
      console.log("📭 Nenhum favorito encontrado");
      return [];
    }

    try {
      const value = typeof garagemMetafield.value === "string" 
        ? JSON.parse(garagemMetafield.value) 
        : garagemMetafield.value;
      
      console.log("✅ Favoritos encontrados:", value);
      return Array.isArray(value) ? value : [];
    } catch (parseError) {
      console.error("❌ Erro ao fazer parse:", parseError);
      return [];
    }
  } catch (error) {
    console.error("❌ Erro em getFavorites:", error.message);
    throw error;
  }
}

/**
 * Guardar metafield "garagem" de um cliente
 */
export async function saveFavorites(customerId, favorites) {
  try {
    console.log("💾 saveFavorites - customerId:", customerId);
    console.log("💾 favorites:", favorites);

    if (!SHOPIFY_STORE || !SHOPIFY_ADMIN_TOKEN) {
      throw new Error("SHOPIFY_STORE ou SHOPIFY_ADMIN_TOKEN não configurados");
    }

    const numericId = customerId.replace("gid://shopify/Customer/", "");
    const metafieldsUrl = `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/customers/${numericId}/metafields.json`;
    
    const existingResponse = await fetch(metafieldsUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
        "Content-Type": "application/json"
      }
    });

    const existingData = await existingResponse.json();
    const garagemMetafield = (existingData.metafields || []).find(
      (mf) => mf.namespace === "custom" && mf.key === "garagem"
    );

    let response;

    if (garagemMetafield) {
      console.log("🔄 Atualizando metafield existente");
      response = await fetch(
        `https://${SHOPIFY_STORE}/admin/api/${API_VERSION}/metafields/${garagemMetafield.id}.json`,
        {
          method: "PUT",
          headers: {
            "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            metafield: {
              id: garagemMetafield.id,
              value: JSON.stringify(favorites),
              type: "list.collection_reference"
            }
          })
        }
      );
    } else {
      console.log("➕ Criando novo metafield");
      response = await fetch(metafieldsUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          metafield: {
            namespace: "custom",
            key: "garagem",
            value: JSON.stringify(favorites),
            type: "list.collection_reference"
          }
        })
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro ao salvar:", response.status, errorText);
      throw new Error(`Failed to save: ${response.status}`);
    }

    console.log("✅ Metafield salvo");
    return true;
  } catch (error) {
    console.error("❌ Erro em saveFavorites:", error.message);
    throw error;
  }
}

/**
 * Toggle uma coleção
 */
export function toggleCollection(currentFavorites, collectionGid) {
  const index = currentFavorites.indexOf(collectionGid);
  
  if (index >= 0) {
    console.log("➖ Removendo:", collectionGid);
    return currentFavorites.filter((_, i) => i !== index);
  } else {
    console.log("➕ Adicionando:", collectionGid);
    return [...currentFavorites, collectionGid];
  }
}