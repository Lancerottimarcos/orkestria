import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { canSeeTeamCompensation } from "@/app/api/equipe/route";
import { squadSchema } from "@/lib/schemas";

export async function GET() {
  const { session, error } = await requireModule("squads");
  if (error) return error;

  // Mesma regra do /api/equipe: salário do TeamMember só sai pra quem tem
  // financeiro liberado (ou admin), mesmo com o módulo "squads" já liberado.
  const canSeeCompensation = await canSeeTeamCompensation(session!.user.id, session!.user.role);
  const memberOmit = canSeeCompensation ? {} : { monthlyValue: true as const, paymentType: true as const };

  const squads = await prisma.squad.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: {
      lead: { omit: memberOmit },
      members: { include: { teamMember: { omit: memberOmit } } },
      projects: {
        include: {
          kanbanCards: { select: { completedAt: true, dueDate: true, estimatedHours: true } },
        },
      },
    },
  });

  return Response.json(squads);
}

export async function POST(request: Request) {
  const { error } = await requireModule("squads");
  if (error) return error;

  const body = await request.json();
  const parsed = squadSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const maxPosition = await prisma.squad.aggregate({ _max: { position: true } });

  const squad = await prisma.squad.create({
    data: {
      name: data.name,
      description: data.description || null,
      avatarUrl: data.avatarUrl || null,
      color: data.color || null,
      icon: data.icon || null,
      leadId: data.leadId || null,
      position: (maxPosition._max.position ?? -1) + 1,
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

  return Response.json(squad, { status: 201 });
}
