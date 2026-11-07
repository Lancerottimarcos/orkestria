import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "tiktok";

export type TikTokAppCredentials = { clientKey: string; clientSecret: string; redirectUri: string };

/** URL de redirecionamento do OAuth: fixa por ambiente, não editável no painel. */
export function getTikTokRedirectUri(): string {
  const explicit = process.env.TIKTOK_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/tiktok/callback`;
}

/** Lê o Client Key/Secret configurados no painel Configurações → Integrações. */
export async function getTikTokAppCredentials(): Promise<TikTokAppCredentials | null> {
  const config = await prisma.tikTokAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.clientKey || !config.clientSecretEnc) return null;
  return {
    clientKey: config.clientKey,
    clientSecret: decryptSecret(config.clientSecretEnc),
    redirectUri: getTikTokRedirectUri(),
  };
}

export async function getTikTokAppStatus(): Promise<{ clientKey: string | null; hasSecret: boolean; updatedAt: Date | null }> {
  const config = await prisma.tikTokAppConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    clientKey: config?.clientKey ?? null,
    hasSecret: Boolean(config?.clientSecretEnc),
    updatedAt: config?.updatedAt ?? null,
  };
}

/** Salva/atualiza o Client Key e Secret. Passe clientSecret undefined para manter o valor já salvo. */
export async function saveTikTokAppCredentials(params: {
  clientKey: string;
  clientSecret?: string;
  updatedById: string;
}) {
  await prisma.tikTokAppConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      clientKey: params.clientKey,
      clientSecretEnc: params.clientSecret ? encryptSecret(params.clientSecret) : null,
      updatedById: params.updatedById,
    },
    update: {
      clientKey: params.clientKey,
      ...(params.clientSecret ? { clientSecretEnc: encryptSecret(params.clientSecret) } : {}),
      updatedById: params.updatedById,
    },
  });
}
