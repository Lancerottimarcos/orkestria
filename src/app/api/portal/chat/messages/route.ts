import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { chatMessageSchema } from "@/lib/schemas";
import { getOrCreateClientChannel } from "@/lib/chat";

export async function GET() {
  const session = await auth();
  if (!session?.user.clientId) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: { id: true, name: true },
  });
  if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

  const channel = await getOrCreateClientChannel(client.id, client.name);

  const messages = await prisma.chatMessage.findMany({
    where: { channelId: channel.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      text: true,
      createdAt: true,
      authorUser: { select: { id: true, name: true } },
      authorClient: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  });

  return Response.json(messages);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.clientId) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    select: { id: true, name: true },
  });
  if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { text, mentionedUserId } = parsed.data;

  let mentionId: string | null = null;
  if (mentionedUserId) {
    const mentioned = await prisma.user.findUnique({ where: { id: mentionedUserId }, select: { id: true, active: true } });
    if (mentioned?.active) mentionId = mentioned.id;
  }

  const channel = await getOrCreateClientChannel(client.id, client.name);

  const message = await prisma.chatMessage.create({
    data: {
      channelId: channel.id,
      text: text.trim(),
      authorClientId: client.id,
      mentionedUserId: mentionId,
    },
    select: {
      id: true,
      text: true,
      createdAt: true,
      authorUser: { select: { id: true, name: true } },
      authorClient: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  });

  return Response.json(message, { status: 201 });
}
