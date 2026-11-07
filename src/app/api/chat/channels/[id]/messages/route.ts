import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { chatMessageSchema } from "@/lib/schemas";
import { canStaffAccessChannel } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

const MESSAGE_SELECT = {
  id: true,
  text: true,
  createdAt: true,
  authorUser: { select: { id: true, name: true } },
  authorClient: { select: { id: true, name: true } },
  mentionedUser: { select: { id: true, name: true } },
  replyTo: {
    select: {
      id: true,
      text: true,
      authorUser: { select: { id: true, name: true } },
      authorClient: { select: { id: true, name: true } },
    },
  },
} as const;

export async function GET(_request: Request, { params }: Params) {
  const { session, error } = await requireModule("chat");
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, role: true, setor: true },
  });
  if (!user || !(await canStaffAccessChannel(id, user))) {
    return Response.json({ error: "Canal não encontrado" }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: MESSAGE_SELECT,
  });

  return Response.json(messages);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireModule("chat");
  if (error) return error;

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, role: true, setor: true },
  });
  if (!user || !(await canStaffAccessChannel(id, user))) {
    return Response.json({ error: "Canal não encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { text, mentionedUserId, replyToId } = parsed.data;

  let validReplyToId: string | null = null;
  if (replyToId) {
    const replySource = await prisma.chatMessage.findUnique({
      where: { id: replyToId },
      select: { channelId: true },
    });
    if (replySource?.channelId === id) validReplyToId = replyToId;
  }

  const message = await prisma.chatMessage.create({
    data: {
      channelId: id,
      text: text.trim(),
      authorUserId: session!.user.id,
      mentionedUserId: mentionedUserId || null,
      replyToId: validReplyToId,
    },
    select: MESSAGE_SELECT,
  });

  return Response.json(message, { status: 201 });
}
