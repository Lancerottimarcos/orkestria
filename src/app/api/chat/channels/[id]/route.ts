import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { chatChannelUpdateSchema } from "@/lib/schemas";
import { canStaffAccessChannel } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
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

  const channel = await prisma.chatChannel.findUnique({ where: { id }, select: { kind: true } });
  if (!channel || channel.kind !== "GROUP") {
    return Response.json({ error: "Apenas grupos podem ser personalizados" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = chatChannelUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.chatChannel.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      ...(data.color !== undefined ? { color: data.color || null } : {}),
    },
    select: { id: true, name: true, avatarUrl: true, color: true },
  });

  return Response.json(updated);
}
