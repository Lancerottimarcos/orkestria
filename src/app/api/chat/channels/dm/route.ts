import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { chatDmSchema } from "@/lib/schemas";
import { getOrCreateDMChannel } from "@/lib/chat";

export async function POST(request: Request) {
  const { session, error } = await requireModule("chat");
  if (error) return error;

  const body = await request.json();
  const parsed = chatDmSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId } = parsed.data;

  if (userId === session!.user.id) {
    return Response.json(
      { error: { fieldErrors: { userId: ["Selecione outra pessoa"] } } },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) {
    return Response.json({ error: { fieldErrors: { userId: ["Usuário não encontrado"] } } }, { status: 404 });
  }

  const channel = await getOrCreateDMChannel(session!.user.id, userId);
  return Response.json({ id: channel.id }, { status: 201 });
}
