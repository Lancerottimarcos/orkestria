import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { serviceSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("servicos");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const service = await prisma.service.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      defaultPrice: data.defaultPrice,
      category: data.category || null,
      coverColor: data.coverColor || null,
    },
  });

  return Response.json(service);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("servicos");
  if (error) return error;

  const { id } = await params;
  await prisma.service.delete({ where: { id } });
  return Response.json({ ok: true });
}
