import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { NewScheduleView } from "@/components/kanban/NewScheduleView";

export default async function NovoAgendamentoPage() {
  await requireModulePage("kanban");

  const clients = await prisma.client.findMany({
    select: { id: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return <NewScheduleView clients={clients} />;
}
