import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { canSeeTeamCompensation } from "@/app/api/equipe/route";
import { TeamView } from "@/components/team/TeamView";

export default async function EquipePage() {
  const session = await requireModulePage("equipe");
  const canSeeCompensation = await canSeeTeamCompensation(session.user.id, session.user.role);
  const members = await prisma.teamMember.findMany({
    orderBy: { name: "asc" },
    omit: canSeeCompensation ? {} : { monthlyValue: true, paymentType: true },
    include: { _count: { select: { squadMemberships: true, leadOfSquads: true } } },
  });

  return (
    <TeamView
      initialMembers={members}
      isAdmin={session?.user.role === "ADMIN"}
    />
  );
}
