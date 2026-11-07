import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalTemplatesView } from "@/components/configuracoes/ProposalTemplatesView";

export default async function ProposalTemplatesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const templates = await prisma.proposalTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, isDefault: true },
  });

  return (
    <div>
      <PageHeader
        title="Modelos de Proposta"
        description="Crie modelos reutilizáveis de proposta comercial, com variáveis do cliente e conteúdo narrativo pronto."
      />
      <ProposalTemplatesView initialTemplates={templates.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))} />
    </div>
  );
}
