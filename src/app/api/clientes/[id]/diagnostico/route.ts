import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { profileDiagnosisSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

function serialize(diagnosis: NonNullable<Awaited<ReturnType<typeof prisma.profileDiagnosis.findUnique>>>) {
  return {
    ...diagnosis,
    contentPillars: JSON.parse(diagnosis.contentPillars || "[]"),
    strengths: JSON.parse(diagnosis.strengths || "[]"),
    weaknesses: JSON.parse(diagnosis.weaknesses || "[]"),
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const diagnosis = await prisma.profileDiagnosis.findUnique({ where: { clientId: id } });
  if (!diagnosis) return Response.json(null);
  return Response.json(serialize(diagnosis));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = profileDiagnosisSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const fields = {
    instagramHandle: data.instagramHandle || null,
    audience: data.audience || null,
    positioning: data.positioning || null,
    contentPillars: JSON.stringify(data.contentPillars ?? []),
    strengths: JSON.stringify(data.strengths ?? []),
    weaknesses: JSON.stringify(data.weaknesses ?? []),
    avgLikes: data.avgLikes ?? null,
    avgComments: data.avgComments ?? null,
    avgShares: data.avgShares ?? null,
    storyInteraction: data.storyInteraction || null,
    rating: data.rating || null,
    recommendations: data.recommendations || null,
  };

  const diagnosis = await prisma.profileDiagnosis.upsert({
    where: { clientId: id },
    update: fields,
    create: { ...fields, clientId: id },
  });

  return Response.json(serialize(diagnosis));
}
