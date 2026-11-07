import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProposalTemplateEditorScreen } from "@/components/configuracoes/ProposalTemplateEditorScreen";

type Params = { params: Promise<{ templateId: string }> };

export default async function ProposalTemplateEditorPage({ params }: Params) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const { templateId } = await params;
  const template = await prisma.proposalTemplate.findUnique({ where: { id: templateId } });
  if (!template) notFound();

  return (
    <ProposalTemplateEditorScreen
      template={{
        id: template.id,
        name: template.name,
        bodyJson: template.bodyJson,
        headerUrl: template.headerUrl,
        footerUrl: template.footerUrl,
        isDefault: template.isDefault,
      }}
    />
  );
}
