import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormPublicView } from "@/components/formularios/FormPublicView";

type Params = { params: Promise<{ token: string }> };

export default async function FormularioPublicPage({ params }: Params) {
  const { token } = await params;

  const form = await prisma.customForm.findUnique({
    where: { token },
    select: {
      id: true,
      title: true,
      description: true,
      active: true,
      fields: {
        orderBy: { position: "asc" },
        select: { id: true, label: true, type: true, required: true, options: true },
      },
    },
  });

  if (!form) notFound();

  const serialized = {
    ...form,
    fields: form.fields.map((f) => ({ ...f, options: f.options ? (JSON.parse(f.options) as string[]) : [] })),
  };

  return <FormPublicView token={token} initialForm={serialized} />;
}
