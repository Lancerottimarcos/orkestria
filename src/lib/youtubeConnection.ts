import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { GoogleTokenResult, YouTubeChannelInfo } from "@/lib/youtube";

/**
 * Assina o state do OAuth do Google. Diferente do TikTok, o Google não exige
 * PKCE pra apps web confidenciais (com client_secret) - só clientId+timestamp
 * pra validar CSRF e vincular o callback ao cliente certo.
 */
export function signYouTubeState(clientId: string): string {
  const payload = `${clientId}|${Date.now()}`;
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyYouTubeState(state: string): { clientId: string } | null {
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

/**
 * Cria/atualiza a conta do YouTube conectada. Um login já autoriza um único
 * canal (o "meu canal" da conta Google que autorizou) - sem etapa de escolha.
 */
export async function finalizeYouTubeConnection(
  clientId: string,
  userId: string,
  token: GoogleTokenResult,
  channel: YouTubeChannelInfo,
) {
  if (!token.refresh_token) {
    throw new Error(
      "O Google não devolveu um refresh_token - normalmente acontece quando a conta já tinha autorizado este app antes. Revogue o acesso em myaccount.google.com/permissions e conecte de novo.",
    );
  }
  const now = Date.now();

  await prisma.socialAccount.upsert({
    where: { clientId_platform: { clientId, platform: "YOUTUBE" } },
    create: {
      clientId,
      platform: "YOUTUBE",
      externalAccountId: channel.channelId,
      name: channel.title,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      status: "ACTIVE",
      connectedById: userId,
    },
    update: {
      externalAccountId: channel.channelId,
      name: channel.title,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: encryptSecret(token.refresh_token),
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      status: "ACTIVE",
      lastError: null,
      connectedById: userId,
    },
  });
}
