import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { canStaffAccessChannel } from "@/lib/chat";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
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

  const membership = await prisma.chatChannelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: user.id } },
  });

  const updated = membership
    ? await prisma.chatChannelMember.update({
        where: { id: membership.id },
        data: { pinned: !membership.pinned },
      })
    : await prisma.chatChannelMember.create({
        data: { channelId: id, userId: user.id, pinned: true },
      });

  return Response.json({ pinned: updated.pinned });
}
