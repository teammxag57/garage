// lib/sessions.js
import { prisma } from "./prisma.js";

export async function saveShopToken(shop, accessToken, scopes) {
  return prisma.shopSession.upsert({
    where: { shop },
    update: { accessToken, scopes },
    create: { shop, accessToken, scopes },
  });
}

export async function getShopToken(shop) {
  const row = await prisma.shopSession.findUnique({ where: { shop } });
  return row?.accessToken || null;
}
