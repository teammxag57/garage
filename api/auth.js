import crypto from "crypto";
import { buildAuthUrl } from "../lib/shopify.js";
import { createOAuthState } from "../lib/sessions.js";

export default async function handler(req, res) {
  try {
    const shop = req.query.shop;
    if (!shop) return res.status(400).send("Missing shop");

    // ✅ NÃO validar HMAC aqui.
    // O kickoff (/api/auth) só precisa do shop e de criar state.
    const state = crypto.randomBytes(16).toString("hex");
    await createOAuthState(shop, state);

    return res.redirect(302, buildAuthUrl(shop, state));
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
