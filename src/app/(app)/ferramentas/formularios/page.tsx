import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { FormulariosView } from "@/components/formularios/FormulariosView";

export default async function FormulariosPage() {
  await requireModulePage("ferramentas");

  const forms = await prisma.customForm.findMany({
    // Pesquisa de NPS (auto-criada por getOrCreateNpsForm, src/lib/nps.ts) não
    // é um formulário que a agência criou - some daqui pra não poluir a grade
    // nem ficar editável/excluível pelo fluxo genérico (isso quebraria o link
    // já compartilhado com o cliente e apagaria o histórico de satisfação).
    where: { isNpsTemplate: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      active: true,
      token: true,
      createdAt: true,
      client: { select: { id: true, name: true } },
      _count: { select: { fields: true, submissions: true } },
    },
  });

  const serializedForms = forms.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }));

  return <FormulariosView initialForms={serializedForms} />;
}
