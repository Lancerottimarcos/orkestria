import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { FormBuilderPage } from "@/components/formularios/FormBuilderPage";

type Params = { params: Promise<{ id: string }> };

export default async function EditarFormularioPage({ params }: Params) {
  await requireModulePage("ferramentas");
  const { id } = await params;

  const [clients, form] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, avatarUrl: true } }),
    prisma.customForm.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        active: true,
        clientId: true,
        fields: {
          orderBy: { position: "asc" },
          select: { id: true, label: true, type: true, required: true, options: true },
        },
      },
    }),
  ]);

  if (!form) notFound();

  const fields = form.fields.map((f) => ({ ...f, options: f.options ? (JSON.parse(f.options) as string[]) : [] }));

  return (
    <FormBuilderPage
      formId={id}
      clients={clients}
      initialTitle={form.title}
      initialDescription={form.description ?? ""}
      initialClientId={form.clientId ?? ""}
      initialActive={form.active}
      initialFields={fields}
    />
  );
}
