import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "linkedin";

export type LinkedInAppCredentials = { clientId: string; clientSecret: string; redirectUri: string };

/** URL de redirecionamento do OAuth: fixa por ambiente, não editável no painel. */
export function getLinkedInRedirectUri(): string {
  const explicit = process.env.LINKEDIN_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/linkedin/callback`;
}

/** Lê o Client ID/Secret (do app do LinkedIn Developer Portal) configurados no painel Configurações → Integrações. */
export async function getLinkedInAppCredentials(): Promise<LinkedInAppCredentials | null> {
  const config = await prisma.linkedInAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.clientId || !config.clientSecretEnc) return null;
  return {
    clientId: config.clientId,
    clientSecret: decryptSecret(config.clientSecretEnc),
    redirectUri: getLinkedInRedirectUri(),
  };
}

export async function getLinkedInAppStatus(): Promise<{ clientId: string | null; hasSecret: boolean; updatedAt: Date | null }> {
  const config = await prisma.linkedInAppConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    clientId: config?.clientId ?? null,
    hasSecret: Boolean(config?.clientSecretEnc),
    updatedAt: config?.updatedAt ?? null,
  };
}

/** Salva/atualiza o Client ID e Secret. Passe clientSecret undefined para manter o valor já salvo. */
export async function saveLinkedInAppCredentials(params: {
  clientId: string;
  clientSecret?: string;
  updatedById: string;
}) {
  await prisma.linkedInAppConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      clientId: params.clientId,
      clientSecretEnc: params.clientSecret ? encryptSecret(params.clientSecret) : null,
      updatedById: params.updatedById,
    },
    update: {
      clientId: params.clientId,
      ...(params.clientSecret ? { clientSecretEnc: encryptSecret(params.clientSecret) } : {}),
      updatedById: params.updatedById,
    },
  });
}
