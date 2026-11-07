import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ContractTemplatesView } from "@/components/configuracoes/ContractTemplatesView";

export default async function ContractTemplatesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const [templates, company] = await Promise.all([
    prisma.contractTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true, headerUrl: true, isDefault: true },
    }),
    prisma.companySettings.findFirst(),
  ]);

  // Os dados da agência entram como CONTRATADA em todos os contratos - sem
  // eles preenchidos, o contrato sai com "-" no lugar. O aviso lista o que
  // falta pra garantir contrato 100% preenchido.
  const companyMissing: string[] = [];
  if (!company || company.name === "Minha Agência") companyMissing.push("razão social");
  if (!company?.document) companyMissing.push("CNPJ");
  if (!company?.address) companyMissing.push("endereço");
  if (!company?.email) companyMissing.push("e-mail");
  if (!company?.phone) companyMissing.push("telefone");
  if (!company?.pixKey) companyMissing.push("chave PIX");

  return (
    <div>
      <PageHeader
        title="Modelos de Contrato"
        description="Crie modelos reutilizáveis com variáveis do cliente, marca d'água, cabeçalho e rodapé."
      />
      <ContractTemplatesView
        initialTemplates={templates.map((t) => ({ ...t, updatedAt: t.updatedAt.toISOString() }))}
        companyMissing={companyMissing}
      />
    </div>
  );
}
