import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "whatsapp";
const GRAPH_API_VERSION = "v21.0";

export type WhatsAppCredentials = { phoneNumberId: string; accessToken: string; appSecret: string | null; verifyToken: string | null };

/**
 * Config do WhatsApp Business (Cloud API) - linha do banco tem prioridade,
 * cai pras variáveis de ambiente (WHATSAPP_*) se a linha não existir, pra
 * não quebrar uma instalação que já estivesse configurada só por env var.
 */
export async function getWhatsAppCredentials(): Promise<WhatsAppCredentials | null> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (config?.phoneNumberId && config.accessTokenEnc) {
    return {
      phoneNumberId: config.phoneNumberId,
      accessToken: decryptSecret(config.accessTokenEnc),
      appSecret: config.appSecretEnc ? decryptSecret(config.appSecretEnc) : (process.env.WHATSAPP_APP_SECRET ?? null),
      verifyToken: config.verifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN ?? null,
    };
  }
  if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_TOKEN,
      appSecret: process.env.WHATSAPP_APP_SECRET ?? null,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? null,
    };
  }
  return null;
}

export async function getWhatsAppStatus(): Promise<{
  hasConfig: boolean;
  hasAppSecret: boolean;
  displayName: string | null;
  updatedAt: Date | null;
  usingEnvFallback: boolean;
}> {
  const config = await prisma.whatsAppConfig.findUnique({ where: { id: CONFIG_ID } });
  if (config?.phoneNumberId && config.accessTokenEnc) {
    return {
      hasConfig: true,
      hasAppSecret: Boolean(config.appSecretEnc || process.env.WHATSAPP_APP_SECRET),
      displayName: config.displayName,
      updatedAt: config.updatedAt,
      usingEnvFallback: false,
    };
  }
  const usingEnv = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  return {
    hasConfig: usingEnv,
    hasAppSecret: usingEnv && Boolean(process.env.WHATSAPP_APP_SECRET),
    displayName: null,
    updatedAt: null,
    usingEnvFallback: usingEnv,
  };
}

export async function saveWhatsAppCredentials(params: {
  phoneNumberId: string;
  accessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  displayName?: string;
  updatedById: string;
}) {
  await prisma.whatsAppConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      phoneNumberId: params.phoneNumberId,
      accessTokenEnc: params.accessToken ? encryptSecret(params.accessToken) : null,
      verifyToken: params.verifyToken || null,
      appSecretEnc: params.appSecret ? encryptSecret(params.appSecret) : null,
      displayName: params.displayName || null,
      updatedById: params.updatedById,
    },
    update: {
      phoneNumberId: params.phoneNumberId,
      ...(params.accessToken ? { accessTokenEnc: encryptSecret(params.accessToken) } : {}),
      verifyToken: params.verifyToken || null,
      ...(params.appSecret ? { appSecretEnc: encryptSecret(params.appSecret) } : {}),
      displayName: params.displayName || null,
      updatedById: params.updatedById,
    },
  });
}

/** Envia uma mensagem de texto via Cloud API e devolve o id externo (pra registrar na conversa). */
export async function sendWhatsAppMessage(to: string, text: string): Promise<string | null> {
  const credentials = await getWhatsAppCredentials();
  if (!credentials) throw new Error("WhatsApp não configurado");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${credentials.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Falha ao enviar mensagem: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.messages?.[0]?.id ?? null;
}
