import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { FormBuilderPage } from "@/components/formularios/FormBuilderPage";

export default async function NovoFormularioPage() {
  await requireModulePage("ferramentas");

  const clients = await prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, avatarUrl: true } });

  return <FormBuilderPage formId={null} clients={clients} />;
}
