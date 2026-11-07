import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ImportarPanel } from "@/components/importar/ImportarPanel";

export default async function ImportarPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const [clients, jobs] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, avatarUrl: true } }),
    prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        targetBoard: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Importar"
        description="Traga demandas e anexos de Trello, ClickUp, Notion ou Asana pro Orkestrya."
      />
      <ImportarPanel
        clients={clients}
        initialJobs={jobs.map((j) => ({
          id: j.id,
          platform: j.platform,
          status: j.status,
          sourceBoardName: j.sourceBoardName,
          totalCards: j.totalCards,
          importedCards: j.importedCards,
          errorMessage: j.errorMessage,
          createdAt: j.createdAt.toISOString(),
          completedAt: j.completedAt ? j.completedAt.toISOString() : null,
          targetBoard: j.targetBoard,
          client: j.client,
          createdBy: j.createdBy,
        }))}
      />
    </div>
  );
}
