import crypto from "crypto";
import { buildAuthUrl, verifyHmacFromQuery } from "../lib/shopify.js";
import { createOAuthState } from "../lib/sessions.js";

export default async function handler(req, res) {
  try {
    const shop = req.query.shop;
    if (!shop) return res.status(400).send("Missing shop");
    if (!verifyHmacFromQuery(req.query)) return res.status(401).send("Invalid hmac");

    const state = crypto.randomBytes(16).toString("hex");
    await createOAuthState(shop, state);

    return res.redirect(302, buildAuthUrl(shop, state));
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
