import { getFavorites, verifyAppProxySignature } from "../../lib/shopify.js";

export default async function handler(req, res) {
  try {
    // (Opcional) valida assinatura do App Proxy
    if (!verifyAppProxySignature(req.query)) {
      return res.status(401).json({ error: "Invalid proxy signature" });
    }

    const customerId = req.query.logged_in_customer_id;
    if (!customerId) return res.status(400).json({ error: "Missing customerId" });

    const favorites = await getFavorites(customerId);
    return res.json({ success: true, favorites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
