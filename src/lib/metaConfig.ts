import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "meta";

export type MetaAppCredentials = { appId: string; appSecret: string; redirectUri: string };

/** URL de redirecionamento do OAuth: fixa por ambiente, não editável no painel. */
export function getMetaRedirectUri(): string {
  const explicit = process.env.META_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/meta/callback`;
}

/** Lê o App ID/Secret configurados no painel Configurações → Integrações. */
export async function getMetaAppCredentials(): Promise<MetaAppCredentials | null> {
  const config = await prisma.metaAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.appId || !config.appSecretEnc) return null;
  return {
    appId: config.appId,
    appSecret: decryptSecret(config.appSecretEnc),
    redirectUri: getMetaRedirectUri(),
  };
}

export async function getMetaAppStatus(): Promise<{ appId: string | null; hasSecret: boolean; updatedAt: Date | null }> {
  const config = await prisma.metaAppConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    appId: config?.appId ?? null,
    hasSecret: Boolean(config?.appSecretEnc),
    updatedAt: config?.updatedAt ?? null,
  };
}

/** Salva/atualiza o App ID e Secret. Passe appSecret undefined para manter o valor já salvo. */
export async function saveMetaAppCredentials(params: {
  appId: string;
  appSecret?: string;
  updatedById: string;
}) {
  await prisma.metaAppConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      appId: params.appId,
      appSecretEnc: params.appSecret ? encryptSecret(params.appSecret) : null,
      updatedById: params.updatedById,
    },
    update: {
      appId: params.appId,
      ...(params.appSecret ? { appSecretEnc: encryptSecret(params.appSecret) } : {}),
      updatedById: params.updatedById,
    },
  });
}
