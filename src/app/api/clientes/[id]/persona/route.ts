import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { personaSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

function serialize(persona: NonNullable<Awaited<ReturnType<typeof loadPersona>>>) {
  return {
    ...persona,
    painPoints: JSON.parse(persona.painPoints || "[]"),
    desires: JSON.parse(persona.desires || "[]"),
    goals: JSON.parse(persona.goals || "[]"),
    objections: JSON.parse(persona.objections || "[]"),
    buyingTriggers: JSON.parse(persona.buyingTriggers || "[]"),
  };
}

function loadPersona(clientId: string) {
  return prisma.persona.findUnique({
    where: { clientId },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const persona = await loadPersona(id);
  if (!persona) return Response.json(null);
  return Response.json(serialize(persona));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = personaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const fields = {
    photoUrl: data.photoUrl || null,
    name: data.name || null,
    age: data.age || null,
    location: data.location || null,
    occupation: data.occupation || null,
    incomeLevel: data.incomeLevel || null,
    painPoints: JSON.stringify(data.painPoints ?? []),
    desires: JSON.stringify(data.desires ?? []),
    goals: JSON.stringify(data.goals ?? []),
    objections: JSON.stringify(data.objections ?? []),
    buyingTriggers: JSON.stringify(data.buyingTriggers ?? []),
    notes: data.notes || null,
  };

  const persona = await prisma.persona.upsert({
    where: { clientId: id },
    update: fields,
    create: { ...fields, clientId: id },
  });

  return Response.json(serialize(persona));
}
