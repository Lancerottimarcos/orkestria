import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { projectSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("projetos");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description || null,
      status: data.status,
      clientId: data.clientId,
      serviceId: data.serviceId || null,
      value: data.value,
      startDate: data.startDate ? new Date(data.startDate) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      squadId: data.squadId || null,
      coverColor: data.coverColor || null,
    },
    include: { client: true, service: true },
  });

  return Response.json(project);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("projetos");
  if (error) return error;

  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return Response.json({ ok: true });
}
