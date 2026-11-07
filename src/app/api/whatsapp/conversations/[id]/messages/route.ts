import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { whatsAppMessageSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("whatsapp");
  if (error) return error;

  const { id } = await params;
  const messages = await prisma.whatsAppMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "asc" },
    include: { sentByUser: { select: { id: true, name: true } } },
  });
  return Response.json(messages);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireModule("whatsapp");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = whatsAppMessageSchema.safeParse(body);
  if (!parsed.success) {
    // Erro como string simples (não .flatten()) - o único campo é `text` e o
    // front-end (WhatsAppInboxView) espera `data.error` como texto direto.
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Mensagem inválida" }, { status: 400 });
  }
  const { text } = parsed.data;

  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id }, select: { phoneNumber: true } });
  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  let externalId: string | null = null;
  try {
    externalId = await sendWhatsAppMessage(conversation.phoneNumber, text);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao enviar mensagem" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.whatsAppMessage.create({
      data: { conversationId: id, direction: "OUTBOUND", text, externalId, sentByUserId: session!.user.id },
      include: { sentByUser: { select: { id: true, name: true } } },
    }),
    prisma.whatsAppConversation.update({ where: { id }, data: { lastMessageAt: new Date() } }),
  ]);

  return Response.json(message, { status: 201 });
}
