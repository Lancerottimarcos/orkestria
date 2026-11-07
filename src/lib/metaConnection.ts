import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { ManagedPage } from "@/lib/meta";

export const META_PENDING_COOKIE = "meta_pending_pages";

/** Assina o state do OAuth (clientId + validade) pra impedir CSRF/adulteração no callback. */
export function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyState(state: string): { clientId: string; ts: number } | null {
  const secret = process.env.AUTH_SECRET ?? "";
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const [clientId, tsStr] = payload.split("|");
  const ts = Number(tsStr);
  if (!clientId || Number.isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) return null;
  return { clientId, ts };
}

/** Cria/atualiza as contas conectadas (Facebook e, se vinculado, Instagram) para uma Página escolhida. */
export async function finalizeMetaConnection(clientId: string, userId: string, page: ManagedPage, metaUserId: string) {
  await prisma.socialAccount.upsert({
    where: { clientId_platform: { clientId, platform: "FACEBOOK" } },
    create: {
      clientId,
      platform: "FACEBOOK",
      externalAccountId: page.id,
      metaUserId,
      name: page.name,
      accessTokenEnc: encryptSecret(page.access_token),
      status: "ACTIVE",
      connectedById: userId,
    },
    update: {
      externalAccountId: page.id,
      metaUserId,
      name: page.name,
      accessTokenEnc: encryptSecret(page.access_token),
      status: "ACTIVE",
      lastError: null,
      connectedById: userId,
    },
  });

  if (page.instagram_business_account) {
    const igName = page.instagram_business_account.username
      ? `@${page.instagram_business_account.username}`
      : page.name;
    await prisma.socialAccount.upsert({
      where: { clientId_platform: { clientId, platform: "INSTAGRAM" } },
      create: {
        clientId,
        platform: "INSTAGRAM",
        externalAccountId: page.instagram_business_account.id,
        externalPageId: page.id,
        metaUserId,
        name: igName,
        accessTokenEnc: encryptSecret(page.access_token),
        status: "ACTIVE",
        connectedById: userId,
      },
      update: {
        externalAccountId: page.instagram_business_account.id,
        externalPageId: page.id,
        metaUserId,
        name: igName,
        accessTokenEnc: encryptSecret(page.access_token),
        status: "ACTIVE",
        lastError: null,
        connectedById: userId,
      },
    });
  }
}
