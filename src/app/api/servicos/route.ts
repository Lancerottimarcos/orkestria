import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { serviceSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("servicos");
  if (error) return error;

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });
  return Response.json(services);
}

export async function POST(request: Request) {
  const { error } = await requireModule("servicos");
  if (error) return error;

  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const service = await prisma.service.create({
    data: {
      name: data.name,
      description: data.description || null,
      defaultPrice: data.defaultPrice,
      category: data.category || null,
      coverColor: data.coverColor || null,
    },
  });

  return Response.json(service, { status: 201 });
}
