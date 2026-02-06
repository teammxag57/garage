import { verifyHmacFromQuery, exchangeCodeForToken } from "../lib/shopify.js";
import { consumeOAuthState, saveShopToken } from "../lib/sessions.js";

export default async function handler(req, res) {
  try {
    const { shop, code, state } = req.query;
    if (!shop || !code || !state) return res.status(400).send("Missing params");
    if (!verifyHmacFromQuery(req.query)) return res.status(401).send("Invalid hmac");

    const expectedShop = await consumeOAuthState(state);
    if (!expectedShop || expectedShop !== shop) return res.status(401).send("Invalid state");

    const token = await exchangeCodeForToken(shop, code);
    await saveShopToken(shop, token, process.env.SCOPES || "");

    // Podes redirecionar para uma página “instalado com sucesso”
    return res.status(200).send("App installed ✅ You can close this tab.");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
}
