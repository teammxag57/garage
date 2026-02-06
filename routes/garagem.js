import express from "express";
import { getFavorites, saveFavorites, toggleCollection } from "../utils/shopify.js";

const router = express.Router();

// Toggle uma coleção na garagem
router.post("/toggle", async (req, res) => {
  try {
    const customerId = req.query.logged_in_customer_id; // enviado pelo App Proxy
    const { collectionGid } = req.body;

    if (!customerId || !collectionGid) return res.status(400).json({ error: "Missing data" });

    const current = await getFavorites(customerId);
    const updated = toggleCollection(current, collectionGid);
    await saveFavorites(customerId, updated);

    res.json({ success: true, favorites: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Listar todas as coleções na garagem
router.get("/list", async (req, res) => {
  try {
    const customerId = req.query.logged_in_customer_id;
    if (!customerId) return res.status(400).json({ error: "Missing customerId" });

    const favorites = await getFavorites(customerId);
    res.json({ success: true, favorites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
