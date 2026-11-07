import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { PageHeader } from "@/components/ui/PageHeader";
import { TimesheetView } from "@/components/timesheet/TimesheetView";

export default async function TimesheetPage() {
  await requireModulePage("timesheet");

  const [users, clients] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Timesheet" description="Apontamentos de horas por card, cliente e membro da equipe." />
      <TimesheetView users={users} clients={clients} />
    </div>
  );
}
