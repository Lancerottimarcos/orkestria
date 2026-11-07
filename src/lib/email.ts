import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "email";

export async function getEmailStatus(): Promise<{
  provider: string;
  hasKey: boolean;
  hasStoredKey: boolean;
  fromAddress: string | null;
  fromName: string | null;
  updatedAt: Date | null;
}> {
  const config = await prisma.emailConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    provider: config?.provider ?? "resend",
    // "Configurado" de verdade exige remetente também - uma chave sem
    // fromAddress nunca consegue enviar e-mail (sendEmail exige os dois),
    // então o badge não pode acender só com a chave salva.
    hasKey: Boolean(config?.apiKeyEnc && config.fromAddress),
    hasStoredKey: Boolean(config?.apiKeyEnc),
    fromAddress: config?.fromAddress ?? null,
    fromName: config?.fromName ?? null,
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function saveEmailCredentials(params: {
  provider: string;
  apiKey?: string;
  fromAddress?: string;
  fromName?: string;
  updatedById: string;
}) {
  await prisma.emailConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      provider: params.provider,
      apiKeyEnc: params.apiKey ? encryptSecret(params.apiKey) : null,
      fromAddress: params.fromAddress || null,
      fromName: params.fromName || null,
      updatedById: params.updatedById,
    },
    update: {
      provider: params.provider,
      ...(params.apiKey ? { apiKeyEnc: encryptSecret(params.apiKey) } : {}),
      fromAddress: params.fromAddress || null,
      fromName: params.fromName || null,
      updatedById: params.updatedById,
    },
  });
}

/**
 * Envia um e-mail transacional via Resend (API REST simples, sem SDK). Não
 * lança erro pra chamador não travar o fluxo principal por causa de e-mail -
 * devolve { ok, error } e quem chama decide o que fazer com a falha.
 */
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; error?: string }> {
  const config = await prisma.emailConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.apiKeyEnc || !config.fromAddress) {
    return { ok: false, error: "E-mail não configurado - adicione a chave de API em Configurações → Integrações" };
  }

  const apiKey = decryptSecret(config.apiKeyEnc);
  const from = config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Falha ao enviar e-mail (${res.status}): ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Falha ao enviar e-mail" };
  }
}
