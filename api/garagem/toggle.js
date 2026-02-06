import {
  getFavorites,
  saveFavorites,
  toggleCollection,
  verifyAppProxySignature,
} from "../../lib/shopify.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    if (!verifyAppProxySignature(req.query)) {
      return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const customerId = req.query.logged_in_customer_id;
    const { collectionGid } = req.body || {};

    if (!customerId || !collectionGid) {
      return res.status(400).json({ error: "Missing data" });
    }

    const current = await getFavorites(customerId);
    const updated = toggleCollection(current, collectionGid);
    await saveFavorites(customerId, updated);

    return res.json({ success: true, favorites: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
