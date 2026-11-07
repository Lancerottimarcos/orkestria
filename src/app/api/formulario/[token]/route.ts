import { prisma } from "@/lib/prisma";
import { customFormSubmissionSchema } from "@/lib/schemas";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
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

  if (!form) return Response.json({ error: "Formulário não encontrado" }, { status: 404 });

  return Response.json({
    ...form,
    fields: form.fields.map((f) => ({ ...f, options: f.options ? JSON.parse(f.options) : [] })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const body = await request.json();
  const parsed = customFormSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const form = await prisma.customForm.findUnique({
    where: { token },
    select: {
      id: true,
      active: true,
      fields: { select: { id: true, label: true, type: true, required: true, options: true } },
    },
  });
  if (!form) return Response.json({ error: "Formulário não encontrado" }, { status: 404 });
  if (!form.active) return Response.json({ error: "Este formulário não está mais recebendo respostas" }, { status: 400 });

  const fieldById = new Map(form.fields.map((f) => [f.id, f]));

  // Nenhuma resposta pode referenciar um campo que não é desse formulário
  // (evita gravar lixo/campo de outro formulário na mesma submissão).
  for (const r of data.responses) {
    if (!fieldById.has(r.fieldId)) {
      return Response.json({ error: "Resposta inválida: campo desconhecido" }, { status: 400 });
    }
  }

  const responseByField = new Map(data.responses.map((r) => [r.fieldId, r.value]));

  for (const field of form.fields) {
    const value = (responseByField.get(field.id) ?? "").trim();
    if (field.required && !value) {
      return Response.json({ error: `O campo "${field.label}" é obrigatório` }, { status: 400 });
    }
    if (!value) continue;

    if (field.type === "RATING") {
      if (!["1", "2", "3", "4", "5"].includes(value)) {
        return Response.json({ error: `Valor inválido para o campo "${field.label}"` }, { status: 400 });
      }
      continue;
    }

    if (field.type === "SELECT" || field.type === "RADIO" || field.type === "CHECKBOX") {
      const options: string[] = field.options ? JSON.parse(field.options) : [];
      if (options.length === 0) continue;
      const selected = field.type === "CHECKBOX" ? value.split(",").map((v) => v.trim()).filter(Boolean) : [value];
      if (selected.some((v) => !options.includes(v))) {
        return Response.json({ error: `Opção inválida para o campo "${field.label}"` }, { status: 400 });
      }
    }
  }

  await prisma.customFormSubmission.create({
    data: {
      formId: form.id,
      respondentName: data.respondentName || null,
      respondentEmail: data.respondentEmail || null,
      responses: {
        create: data.responses.map((r) => ({ fieldId: r.fieldId, value: r.value })),
      },
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
