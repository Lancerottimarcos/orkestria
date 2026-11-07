import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { squadSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("squads");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = squadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  await prisma.squadMember.deleteMany({ where: { squadId: id } });

  const squad = await prisma.squad.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      avatarUrl: data.avatarUrl || null,
      color: data.color || null,
      icon: data.icon || null,
      leadId: data.leadId || null,
      members: {
        create: (data.memberIds ?? []).map((teamMemberId) => ({ teamMemberId })),
      },
    },
    include: {
      lead: true,
      members: { include: { teamMember: true } },
      projects: { include: { kanbanCards: { select: { completedAt: true, dueDate: true, estimatedHours: true } } } },
    },
  });

  return Response.json(squad);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("squads");
  if (error) return error;

  const { id } = await params;
  await prisma.squad.delete({ where: { id } });
  return Response.json({ ok: true });
}
