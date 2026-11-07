import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { canSeeTeamCompensation } from "@/app/api/equipe/route";
import { SquadsView } from "@/components/squads/SquadsView";
import { computeSquadStats } from "@/lib/squadStats";

export default async function SquadsPage() {
  const session = await requireModulePage("squads");
  const canSeeCompensation = await canSeeTeamCompensation(session.user.id, session.user.role);
  const memberOmit = canSeeCompensation ? {} : { monthlyValue: true as const, paymentType: true as const };

  const [squads, teamMembers] = await Promise.all([
    prisma.squad.findMany({
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
    }),
    prisma.teamMember.findMany({ where: { active: true }, orderBy: { name: "asc" }, omit: memberOmit }),
  ]);

  const serialized = squads.map((squad) => ({
    id: squad.id,
    name: squad.name,
    description: squad.description,
    avatarUrl: squad.avatarUrl,
    color: squad.color,
    icon: squad.icon,
    lead: squad.lead,
    members: squad.members.map((m) => m.teamMember),
    stats: computeSquadStats(squad.projects),
  }));

  return <SquadsView initialSquads={serialized} teamMembers={teamMembers} />;
}
