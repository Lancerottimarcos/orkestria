import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getWhatsAppCredentials } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const credentials = await getWhatsAppCredentials();
  if (mode === "subscribe" && challenge && token && credentials?.verifyToken && token === credentials.verifyToken) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null, appSecret: string | null) {
  // Fail-closed: sem a chave de assinatura configurada, não dá pra verificar
  // nada - aceitar de qualquer jeito abriria o endpoint pra payload forjado
  // de qualquer origem.
  if (!appSecret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);

  const expectedBuf = Buffer.from(expected, "hex");
  const providedBuf = Buffer.from(provided, "hex");
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

function onlyDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Casa `message.from` (formato E.164 sem "+", ex: "5511999998888") com o
 * telefone cadastrado no Client (texto livre, ex: "(11) 99999-8888") pelos
 * últimos 8 dígitos (número local, sem DDD/DDI) - uma comparação de
 * igualdade exata entre os dois formatos praticamente nunca batia.
 */
async function matchClientByPhone(from: string): Promise<{ id: string } | null> {
  const suffix = onlyDigits(from).slice(-8);
  if (suffix.length < 8) return null;
  const candidates = await prisma.client.findMany({ where: { phone: { not: null } }, select: { id: true, phone: true } });
  const found = candidates.find((c) => c.phone && onlyDigits(c.phone).slice(-8) === suffix);
  return found ? { id: found.id } : null;
}

type WhatsAppWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        contacts?: { profile?: { name?: string } }[];
        messages?: { id: string; from: string; type: string; text?: { body: string } }[];
      };
    }[];
  }[];
};

/** Grava a mensagem recebida numa conversa real (WhatsAppConversation/Message) - não cria mais card automático no Kanban. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const credentials = await getWhatsAppCredentials();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"), credentials?.appSecret ?? null)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  if (!message || message.type !== "text" || !message.text?.body) {
    return Response.json({ ok: true });
  }

  const text = message.text.body.trim();
  if (!text) return Response.json({ ok: true });

  const contactName = value?.contacts?.[0]?.profile?.name ?? null;
  const matchedClient = await matchClientByPhone(message.from);

  const conversation = await prisma.whatsAppConversation.upsert({
    where: { phoneNumber: message.from },
    update: { lastMessageAt: new Date(), ...(contactName ? { contactName } : {}), ...(matchedClient ? { clientId: matchedClient.id } : {}) },
    create: {
      phoneNumber: message.from,
      contactName,
      clientId: matchedClient?.id,
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      text,
      externalId: message.id,
    },
  });

  return Response.json({ ok: true });
}
