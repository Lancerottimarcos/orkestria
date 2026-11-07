import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { chatChannelSchema } from "@/lib/schemas";
import { listChannelsWithMeta } from "@/lib/chat";

export async function GET() {
  const { session, error } = await requireModule("chat");
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, role: true, setor: true },
  });
  if (!user) return Response.json({ error: "Usuário não encontrado" }, { status: 404 });

  const channels = await listChannelsWithMeta(user);
  return Response.json(channels);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("chat");
  if (error) return error;

  const body = await request.json();
  const parsed = chatChannelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  if (data.kind === "SECTOR" && !data.sector?.trim()) {
    return Response.json(
      { error: { fieldErrors: { sector: ["Informe o setor"] } } },
      { status: 400 },
    );
  }

  const memberIds = Array.from(new Set([...(data.memberIds ?? []), session!.user.id]));

  const channel = await prisma.chatChannel.create({
    data: {
      name: data.name,
      kind: data.kind,
      sector: data.kind === "SECTOR" ? data.sector!.trim() : null,
      avatarUrl: data.kind === "GROUP" ? data.avatarUrl || null : null,
      color: data.kind === "GROUP" ? data.color || null : null,
      members:
        data.kind === "GROUP"
          ? { create: memberIds.map((userId) => ({ userId })) }
          : undefined,
    },
    select: { id: true, name: true, kind: true, sector: true, clientId: true },
  });

  return Response.json(channel, { status: 201 });
}
