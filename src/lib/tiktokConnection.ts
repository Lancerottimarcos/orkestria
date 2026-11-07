import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { TikTokTokenResult, TikTokCreatorInfo } from "@/lib/tiktok";

/**
 * Assina o state do OAuth do TikTok. Diferente do da Meta (só clientId+ts),
 * carrega também o code_verifier do PKCE - o TikTok exige PKCE mesmo em app
 * web, e como não existe uma etapa de "Páginas" pra guardar um cookie
 * intermediário, o jeito mais simples é embutir o verifier no próprio state
 * assinado (HMAC), sem precisar de nenhum armazenamento server-side.
 */
export function signTikTokState(clientId: string, codeVerifier: string): string {
  const payload = `${clientId}|${Date.now()}|${codeVerifier}`;
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyTikTokState(state: string): { clientId: string; codeVerifier: string } | null {
  const secret = process.env.AUTH_SECRET ?? "";
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;
  const payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  const [clientId, tsStr, codeVerifier] = payload.split("|");
  const ts = Number(tsStr);
  if (!clientId || !codeVerifier || Number.isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) return null;
  return { clientId, codeVerifier };
}

/**
 * Cria/atualiza a conta TikTok conectada. Diferente da Meta, um login aqui
 * já autoriza uma única conta (sem conceito de "Páginas"), então não precisa
 * de fluxo de escolha - é direto code → token → creator info → upsert.
 */
export async function finalizeTikTokConnection(
  clientId: string,
  userId: string,
  token: TikTokTokenResult,
  creator: TikTokCreatorInfo,
) {
  const name = creator.creator_nickname || (creator.creator_username ? `@${creator.creator_username}` : "Conta TikTok");
  const now = Date.now();

  await prisma.socialAccount.upsert({
    where: { clientId_platform: { clientId, platform: "TIKTOK" } },
    create: {
      clientId,
      platform: "TIKTOK",
      externalAccountId: token.open_id,
      name,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now + token.refresh_expires_in * 1000),
      status: "ACTIVE",
      connectedById: userId,
    },
    update: {
      externalAccountId: token.open_id,
      name,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now + token.refresh_expires_in * 1000),
      status: "ACTIVE",
      lastError: null,
      connectedById: userId,
    },
  });
}
