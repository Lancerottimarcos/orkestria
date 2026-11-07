import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesStageSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("crm");
  if (error) return error;

  const stages = await prisma.salesStage.findMany({ orderBy: { position: "asc" } });
  return Response.json(stages);
}

export async function POST(request: Request) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const body = await request.json();
  const parsed = salesStageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const maxPosition = await prisma.salesStage.aggregate({ _max: { position: true } });

  const stage = await prisma.salesStage.create({
    data: {
      name: data.name,
      color: data.color || null,
      isWon: data.isWon ?? false,
      isLost: data.isLost ?? false,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return Response.json(stage, { status: 201 });
}
