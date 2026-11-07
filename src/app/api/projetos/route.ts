import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { projectSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("projetos");
  if (error) return error;

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: true, service: true },
  });
  return Response.json(projects);
}

export async function POST(request: Request) {
  const { error } = await requireModule("projetos");
  if (error) return error;

  const body = await request.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const project = await prisma.project.create({
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

  return Response.json(project, { status: 201 });
}
