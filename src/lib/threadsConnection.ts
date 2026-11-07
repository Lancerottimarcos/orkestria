import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { ThreadsProfile } from "@/lib/threads";

/** Assina o state do OAuth (clientId + validade) pra impedir CSRF/adulteração no callback. */
export function signThreadsState(clientId: string): string {
  const payload = `${clientId}|${Date.now()}`;
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyThreadsState(state: string): { clientId: string } | null {
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
  return { clientId };
}

/** Cria/atualiza a conta do Threads conectada. Um login autoriza um único perfil - sem etapa de escolha. */
export async function finalizeThreadsConnection(
  clientId: string,
  userId: string,
  profile: ThreadsProfile,
  token: { access_token: string; expires_in: number },
) {
  const now = Date.now();

  await prisma.socialAccount.upsert({
    where: { clientId_platform: { clientId, platform: "THREADS" } },
    create: {
      clientId,
      platform: "THREADS",
      externalAccountId: profile.id,
      name: `@${profile.username}`,
      accessTokenEnc: encryptSecret(token.access_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      status: "ACTIVE",
      connectedById: userId,
    },
    update: {
      externalAccountId: profile.id,
      name: `@${profile.username}`,
      accessTokenEnc: encryptSecret(token.access_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      status: "ACTIVE",
      lastError: null,
      connectedById: userId,
    },
  });
}
