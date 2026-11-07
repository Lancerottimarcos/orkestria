import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "threads";

export type ThreadsAppCredentials = { appId: string; appSecret: string; redirectUri: string };

/** URL de redirecionamento do OAuth: fixa por ambiente, não editável no painel. */
export function getThreadsRedirectUri(): string {
  const explicit = process.env.THREADS_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/threads/callback`;
}

/** Lê o App ID/Secret do Threads use case (configurados no painel Configurações → Integrações). */
export async function getThreadsAppCredentials(): Promise<ThreadsAppCredentials | null> {
  const config = await prisma.threadsAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.appId || !config.appSecretEnc) return null;
  return {
    appId: config.appId,
    appSecret: decryptSecret(config.appSecretEnc),
    redirectUri: getThreadsRedirectUri(),
  };
}

export async function getThreadsAppStatus(): Promise<{ appId: string | null; hasSecret: boolean; updatedAt: Date | null }> {
  const config = await prisma.threadsAppConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    appId: config?.appId ?? null,
    hasSecret: Boolean(config?.appSecretEnc),
    updatedAt: config?.updatedAt ?? null,
  };
}

/** Salva/atualiza o App ID e Secret. Passe appSecret undefined para manter o valor já salvo. */
export async function saveThreadsAppCredentials(params: {
  appId: string;
  appSecret?: string;
  updatedById: string;
}) {
  await prisma.threadsAppConfig.upsert({
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
