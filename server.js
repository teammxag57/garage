import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Shopify Admin API
const SHOP = process.env.SHOPIFY_SHOP; // ex: "minhaloja.myshopify.com"
const TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // Access token com permissão para clientes/metafields

app.use(bodyParser.json());

// Endpoint do App Proxy
// Shopify envia POST para /apps/garagem -> aqui recebemos
app.post("/apps/garagem/toggle", async (req, res) => {
  try {
    const { collectionId, customerId } = req.body;

    if (!collectionId || !customerId) {
      return res.status(400).json({
        success: false,
        message: "collectionId e customerId são obrigatórios"
      });
    }

    console.log("Toggle garagem:", { collectionId, customerId });

    // 1️⃣ Buscar metafields do cliente
const metafieldsRes = await fetch(
  `https://${process.env.SHOPIFY_STORE}/admin/api/2024-10/customers/${customerId}/metafields.json`,
  {
    headers: {
      "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN,
      "Content-Type": "application/json"
    }
  }
).then(r => r.json());

const metafields = metafieldsRes.metafields || [];

const garagemMetafield = metafields.find(
  mf => mf.namespace === "custom" && mf.key === "garagem"
);

let garagem = [];

if (garagemMetafield && garagemMetafield.value) {
  try {
    garagem = JSON.parse(garagemMetafield.value);
  } catch {
    garagem = [];
  }
}

// TOGGLE
const index = garagem.indexOf(collectionId);
let action;

if (index >= 0) {
  garagem.splice(index, 1);
  action = "removed";
} else {
  garagem.push(collectionId);
  action = "added";
}

    // 3️⃣ Guardar metafield
    const saveRes = await fetch(
      `https://${process.env.SHOPIFY_STORE}/admin/api/2024-10/metafields.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_TOKEN
        },
        body: JSON.stringify({
          metafield: {
            namespace: "custom",
            key: "garagem",
            type: "list.collection_reference",
            owner_resource: "customer",
            owner_id: customerId,
            value: JSON.stringify(garagem)
          }
        })
      }
    );

    if (!saveRes.ok) {
      const err = await saveRes.text();
      console.error("Erro ao salvar metafield:", err);
      throw new Error("Erro ao guardar metafield");
    }

    res.json({
      success: true,
      action: exists ? "removed" : "added",
      garagem
    });

  } catch (error) {
    console.error("❌ ERRO GARAGEM:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
