import { getShopToken } from "../../lib/sessions.js";
import { shopifyGraphQL } from "../../lib/shopify.js";

export default async function handler(req, res) {
  try {
    const shop = req.query.shop;
    const customerId = req.query.logged_in_customer_id;
    if (!shop || !customerId) return res.status(400).json({ error: "Missing shop/customerId" });

    const token = await getShopToken(shop);
    if (!token) return res.status(401).json({ error: "Shop not installed (missing token). Run /api/auth?shop=..." });

    const q = `
      query($id: ID!) {
        customer(id: $id) {
          metafield(namespace: "custom", key: "garagem") { value }
        }
      }
    `;

    const data = await shopifyGraphQL(
      shop,
      token,
      q,
      { id: `gid://shopify/Customer/${customerId}` }
    );

    const value = data.customer?.metafield?.value;
    const favorites = value ? JSON.parse(value) : [];

    return res.json({ success: true, favorites });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
}
