import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const CONFIG_ID = "ai";
const DEFAULT_MODEL_BY_PROVIDER: Record<string, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-4o-mini",
};

export async function getAiStatus(): Promise<{ provider: string; hasKey: boolean; model: string | null; updatedAt: Date | null }> {
  const config = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } });
  return {
    provider: config?.provider ?? "anthropic",
    hasKey: Boolean(config?.apiKeyEnc),
    model: config?.model ?? null,
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function saveAiCredentials(params: { provider: string; apiKey?: string; model?: string; updatedById: string }) {
  await prisma.aiConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      provider: params.provider,
      apiKeyEnc: params.apiKey ? encryptSecret(params.apiKey) : null,
      model: params.model || null,
      updatedById: params.updatedById,
    },
    update: {
      provider: params.provider,
      ...(params.apiKey ? { apiKeyEnc: encryptSecret(params.apiKey) } : {}),
      model: params.model || null,
      updatedById: params.updatedById,
    },
  });
}

async function getAiCredentials(): Promise<{ provider: string; apiKey: string; model: string } | null> {
  const config = await prisma.aiConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!config?.apiKeyEnc) return null;
  return {
    provider: config.provider,
    apiKey: decryptSecret(config.apiKeyEnc),
    model: config.model || DEFAULT_MODEL_BY_PROVIDER[config.provider] || DEFAULT_MODEL_BY_PROVIDER.anthropic,
  };
}

/** Chama o provedor de IA configurado em Configurações → Integrações. Lança erro com mensagem amigável se não estiver configurado. */
export async function generateText(prompt: string): Promise<string> {
  const credentials = await getAiCredentials();
  if (!credentials) {
    throw new Error("IA não configurada - adicione a chave de API em Configurações → Integrações");
  }

  if (credentials.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: credentials.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
      }),
    });
    if (!res.ok) throw new Error(`Falha na API de IA (OpenAI): ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  }

  // Anthropic é o padrão
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": credentials.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: credentials.model,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Falha na API de IA (Anthropic): ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text?.trim() ?? "";
}

/** Monta o prompt de legenda a partir da persona/tom de voz já cadastrados do cliente - o ativo de marca que hoje não é usado em lugar nenhum do sistema. */
export async function draftCaptionForCard(cardId: string): Promise<string> {
  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    select: {
      title: true,
      description: true,
      client: {
        select: {
          name: true,
          persona: { select: { name: true, occupation: true, painPoints: true, desires: true } },
          positioning: {
            select: { archetypePrimary: true, toneOfVoice: true, toneExample: true, communicationStyle: true, essence: true },
          },
        },
      },
    },
  });
  if (!card) throw new Error("Demanda não encontrada");

  const brand = card.client?.positioning;
  const persona = card.client?.persona;

  const briefParts = [
    `Cliente: ${card.client?.name ?? "-"}`,
    card.title && `Título da demanda: ${card.title}`,
    card.description && `Descrição/roteiro: ${card.description}`,
    brand?.archetypePrimary && `Arquétipo de marca: ${brand.archetypePrimary}`,
    brand?.toneOfVoice && `Tom de voz: ${brand.toneOfVoice}`,
    brand?.toneExample && `Exemplo de tom já usado: "${brand.toneExample}"`,
    brand?.communicationStyle && `Estilo de comunicação: ${brand.communicationStyle}`,
    brand?.essence && `Essência da marca: ${brand.essence}`,
    persona?.occupation && `Público-alvo (persona): ${persona.occupation}`,
    persona?.painPoints && `Dores do público: ${persona.painPoints}`,
    persona?.desires && `Desejos do público: ${persona.desires}`,
  ].filter(Boolean);

  const prompt = [
    "Você é um redator de social media de uma agência brasileira. Escreva um rascunho de legenda pra essa publicação,",
    "em português do Brasil, respeitando o tom de voz e a persona descritos abaixo. Seja direto, sem clichês genéricos",
    "de marketing, e devolva só o texto da legenda pronta pra revisão humana (sem explicações, sem aspas em volta).",
    "",
    ...briefParts,
  ].join("\n");

  return generateText(prompt);
}
