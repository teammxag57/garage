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

export async function createOAuthState(shop, state) {
  await prisma.oAuthState.create({ data: { shop, state } });
}

export async function consumeOAuthState(state) {
  const row = await prisma.oAuthState.findUnique({ where: { state } });
  if (!row) return null;
  await prisma.oAuthState.delete({ where: { state } });
  return row.shop;
}
