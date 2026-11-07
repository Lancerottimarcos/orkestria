import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TemplateEditorScreen } from "@/components/configuracoes/TemplateEditorScreen";

type Params = { params: Promise<{ templateId: string }> };

export default async function ContractTemplateEditorPage({ params }: Params) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const { templateId } = await params;
  const template = await prisma.contractTemplate.findUnique({ where: { id: templateId } });
  if (!template) notFound();

  return (
    <TemplateEditorScreen
      template={{
        id: template.id,
        name: template.name,
        bodyJson: template.bodyJson,
        watermarkUrl: template.watermarkUrl,
        headerUrl: template.headerUrl,
        footerUrl: template.footerUrl,
        isDefault: template.isDefault,
      }}
    />
  );
}
