import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { canStaffAccessChannel } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
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

  await prisma.chatChannelMember.upsert({
    where: { channelId_userId: { channelId: id, userId: user.id } },
    update: { lastReadAt: new Date() },
    create: { channelId: id, userId: user.id, lastReadAt: new Date() },
  });

  return Response.json({ ok: true });
}
