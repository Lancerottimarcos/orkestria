import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { BoardTemplatesView } from "@/components/configuracoes/BoardTemplatesView";

export default async function BoardTemplatesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const templates = await prisma.boardTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, description: true, isDefault: true, columns: { select: { id: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Modelos de Quadro"
        description="Crie estruturas de quadro reutilizáveis - o modelo padrão abre automaticamente quando um contrato é assinado."
      />
      <BoardTemplatesView initialTemplates={templates} />
    </div>
  );
}
