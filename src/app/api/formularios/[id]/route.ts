import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { customFormSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

const FORM_SELECT = {
  id: true,
  title: true,
  description: true,
  active: true,
  token: true,
  clientId: true,
  createdAt: true,
  client: { select: { id: true, name: true } },
  fields: {
    orderBy: { position: "asc" as const },
    select: { id: true, label: true, type: true, required: true, options: true },
  },
};

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const { id } = await params;
  const form = await prisma.customForm.findUnique({ where: { id }, select: FORM_SELECT });
  if (!form) return Response.json({ error: "Formulário não encontrado" }, { status: 404 });

  return Response.json({
    ...form,
    fields: form.fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : [] })),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const { id } = await params;
  // A pesquisa de NPS (isNpsTemplate) é auto-gerenciada por getOrCreateNpsForm
  // (src/lib/nps.ts) - editar pelo fluxo genérico de formulário pode remover
  // o campo de nota (RATING) que getNpsSummary espera como fields[0],
  // desligando o NPS do cliente sem nenhum erro visível.
  const target = await prisma.customForm.findUnique({ where: { id }, select: { isNpsTemplate: true } });
  if (target?.isNpsTemplate) {
    return Response.json({ error: "Pesquisa de satisfação (NPS) não pode ser editada por aqui" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = customFormSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Atualiza campos existentes no lugar (por id) em vez de apagar tudo e
  // recriar - CustomFormFieldResponse é cascade em CustomFormField, então
  // apagar um campo que ainda existe (só porque mudou de posição/rótulo)
  // apagava as respostas já recebidas pra ele. Só campos genuinamente
  // removidos pelo usuário são de fato apagados (e levam junto suas
  // respostas, o que é o esperado nesse caso).
  const existingFields = await prisma.customFormField.findMany({ where: { formId: id }, select: { id: true } });
  const existingIds = new Set(existingFields.map((f) => f.id));
  const incomingIds = new Set(data.fields.filter((f) => f.id).map((f) => f.id!));
  const idsToDelete = existingFields.map((f) => f.id).filter((fieldId) => !incomingIds.has(fieldId));

  await prisma.$transaction([
    ...(idsToDelete.length > 0 ? [prisma.customFormField.deleteMany({ where: { id: { in: idsToDelete } } })] : []),
    prisma.customForm.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description || null,
        clientId: data.clientId || null,
        active: data.active ?? true,
      },
    }),
    ...data.fields.map((field, index) => {
      const fieldData = {
        label: field.label,
        type: field.type,
        required: field.required ?? false,
        options: field.options && field.options.length > 0 ? JSON.stringify(field.options) : null,
        position: index,
      };
      return field.id && existingIds.has(field.id)
        ? prisma.customFormField.update({ where: { id: field.id }, data: fieldData })
        : prisma.customFormField.create({ data: { ...fieldData, formId: id } });
    }),
  ]);

  const form = await prisma.customForm.findUnique({ where: { id }, select: FORM_SELECT });
  return Response.json({
    ...form,
    fields: form!.fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : [] })),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const { id } = await params;
  const target = await prisma.customForm.findUnique({ where: { id }, select: { isNpsTemplate: true } });
  if (target?.isNpsTemplate) {
    return Response.json({ error: "Pesquisa de satisfação (NPS) não pode ser excluída por aqui" }, { status: 400 });
  }

  await prisma.customForm.delete({ where: { id } });
  return Response.json({ ok: true });
}
