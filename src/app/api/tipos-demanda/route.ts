import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { demandTypeSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const types = await prisma.demandType.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  return Response.json(types);
}

export async function POST(request: Request) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const body = await request.json();
  const parsed = demandTypeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxPosition = await prisma.demandType.aggregate({ _max: { position: true } });
  const type = await prisma.demandType.create({
    data: {
      name: parsed.data.name,
      color: parsed.data.color,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return Response.json(type, { status: 201 });
}
