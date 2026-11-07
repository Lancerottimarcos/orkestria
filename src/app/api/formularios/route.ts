import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { customFormSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const forms = await prisma.customForm.findMany({
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

  return Response.json(forms);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("ferramentas");
  if (error) return error;

  const body = await request.json();
  const parsed = customFormSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const form = await prisma.customForm.create({
    data: {
      title: data.title,
      description: data.description || null,
      clientId: data.clientId || null,
      active: data.active ?? true,
      createdById: session!.user.id,
      fields: {
        create: data.fields.map((field, index) => ({
          label: field.label,
          type: field.type,
          required: field.required ?? false,
          options: field.options && field.options.length > 0 ? JSON.stringify(field.options) : null,
          position: index,
        })),
      },
    },
    select: { id: true },
  });

  return Response.json(form, { status: 201 });
}
