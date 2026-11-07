import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import type { LinkedInOrganization } from "@/lib/linkedin";

export const LINKEDIN_PENDING_COOKIE = "linkedin_pending_orgs";

/** Assina o state do OAuth (clientId + validade) pra impedir CSRF/adulteração no callback. */
export function signLinkedInState(clientId: string): string {
  const payload = `${clientId}|${Date.now()}`;
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyLinkedInState(state: string): { clientId: string } | null {
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

/** Cria/atualiza a conta do LinkedIn conectada pra uma Company Page escolhida. */
export async function finalizeLinkedInConnection(
  clientId: string,
  userId: string,
  org: LinkedInOrganization,
  token: { access_token: string; expires_in: number; refresh_token?: string; refresh_token_expires_in?: number },
) {
  const now = Date.now();

  await prisma.socialAccount.upsert({
    where: { clientId_platform: { clientId, platform: "LINKEDIN" } },
    create: {
      clientId,
      platform: "LINKEDIN",
      externalAccountId: org.organizationId,
      name: org.name,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      refreshTokenExpiresAt: token.refresh_token_expires_in ? new Date(now + token.refresh_token_expires_in * 1000) : null,
      status: "ACTIVE",
      connectedById: userId,
    },
    update: {
      externalAccountId: org.organizationId,
      name: org.name,
      accessTokenEnc: encryptSecret(token.access_token),
      refreshTokenEnc: token.refresh_token ? encryptSecret(token.refresh_token) : null,
      tokenExpiresAt: new Date(now + token.expires_in * 1000),
      refreshTokenExpiresAt: token.refresh_token_expires_in ? new Date(now + token.refresh_token_expires_in * 1000) : null,
      status: "ACTIVE",
      lastError: null,
      connectedById: userId,
    },
  });
}
