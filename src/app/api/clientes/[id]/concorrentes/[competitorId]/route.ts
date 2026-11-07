import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { competitorSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string; competitorId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, competitorId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = competitorSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const result = await prisma.competitor.updateMany({
    where: { id: competitorId, clientId: id },
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
    },
  });
  if (result.count === 0) return Response.json({ error: "Concorrente não encontrado" }, { status: 404 });

  const competitor = await prisma.competitor.findUnique({ where: { id: competitorId } });
  return Response.json(competitor);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, competitorId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const result = await prisma.competitor.deleteMany({ where: { id: competitorId, clientId: id } });
  if (result.count === 0) return Response.json({ error: "Concorrente não encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
