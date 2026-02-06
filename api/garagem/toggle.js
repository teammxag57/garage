import {
  getFavorites,
  saveFavorites,
  toggleCollection,
  verifyAppProxySignature,
} from "../../lib/shopify.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // App Proxy security
    if (!verifyAppProxySignature(req.query)) {
      return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const shop = req.query.shop;
    const customerId = req.query.logged_in_customer_id;

    // podes aceitar collectionGid por body (POST) ou query (fallback)
    const collectionGid =
      (req.body && req.body.collectionGid) || req.query.collectionGid;

    if (!shop || !customerId || !collectionGid) {
      return res.status(400).json({ error: "Missing shop/customerId/collectionGid" });
    }

    // IMPORTANTE: passar shop para usar o token certo
    const current = await getFavorites(shop, customerId);

    const updated = toggleCollection(current, collectionGid);
    await saveFavorites(shop, customerId, updated);

    const isFavorite = updated.includes(collectionGid);

    return res.json({ success: true, favorites: updated, isFavorite });
  } catch (err) {
    console.error("TOGGLE ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
