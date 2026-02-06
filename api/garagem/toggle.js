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

    // App Proxy security (só valida se vier signature)
    if (req.query.signature && !verifyAppProxySignature(req.query)) {
      return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const shop = String(req.query.shop || "").trim();
    const customerId = String(req.query.logged_in_customer_id || "").trim();

    // aceita por body (JSON) ou query
    const raw =
      (req.body && req.body.collectionGid) || req.query.collectionGid;

    const collectionGid = String(raw || "").trim();

    if (!shop || !customerId || !collectionGid) {
      return res
        .status(400)
        .json({ error: "Missing shop/customerId/collectionGid" });
    }

    // lê atual
    const current = await getFavorites(shop, customerId);

    // garante lista normalizada (strings trimmed)
    const normalizedCurrent = Array.isArray(current)
      ? current.map((x) => String(x).trim()).filter(Boolean)
      : [];

    // toggle
    const updated = toggleCollection(normalizedCurrent, collectionGid);

    await saveFavorites(shop, customerId, updated);

    const isFavorite = updated.includes(collectionGid);

    res.setHeader("Cache-Control", "no-store");

    return res.json({ success: true, favorites: updated, isFavorite });
  } catch (err) {
    console.error("TOGGLE ERROR:", err);
    return res
      .status(500)
      .json({ error: "Server error", detail: String(err?.message || err) });
  }
}
