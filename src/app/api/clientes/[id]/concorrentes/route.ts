import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { competitorSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const competitors = await prisma.competitor.findMany({
    where: { clientId: id },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(competitors);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = competitorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const maxPosition = await prisma.competitor.aggregate({
    where: { clientId: id },
    _max: { position: true },
  });

  const competitor = await prisma.competitor.create({
    data: {
      name: data.name,
      handle: data.handle || null,
      avatarUrl: data.avatarUrl || null,
      followers: data.followers || null,
      frequency: data.frequency || null,
      type: data.type || null,
      sells: data.sells || null,
      differential: data.differential || null,
      niche: data.niche || null,
      strengths: data.strengths || null,
      weaknesses: data.weaknesses || null,
      opportunities: data.opportunities || null,
      position: (maxPosition._max.position ?? -1) + 1,
      clientId: id,
    },
  });

  return Response.json(competitor, { status: 201 });
}
