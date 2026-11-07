import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { positioningSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

function serialize(positioning: NonNullable<Awaited<ReturnType<typeof load>>>) {
  return {
    ...positioning,
    personalityTraits: JSON.parse(positioning.personalityTraits || "[]"),
    communicationStyle: JSON.parse(positioning.communicationStyle || "[]"),
    toneOfVoice: JSON.parse(positioning.toneOfVoice || "[]"),
  };
}

function load(clientId: string) {
  return prisma.positioning.findUnique({
    where: { clientId },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const positioning = await load(id);
  if (!positioning) return Response.json(null);
  return Response.json(serialize(positioning));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = positioningSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const fields = {
    photoUrl: data.photoUrl || null,
    niche: data.niche || null,
    archetypePrimary: data.archetypePrimary || null,
    archetypeSecondary: data.archetypeSecondary || null,
    essence: data.essence || null,
    personalityTraits: JSON.stringify(data.personalityTraits ?? []),
    communicationStyle: JSON.stringify(data.communicationStyle ?? []),
    toneOfVoice: JSON.stringify(data.toneOfVoice ?? []),
    toneExample: data.toneExample || null,
    colorPalette: data.colorPalette || null,
    typography: data.typography || null,
    visualStyle: data.visualStyle || null,
  };

  const positioning = await prisma.positioning.upsert({
    where: { clientId: id },
    update: fields,
    create: { ...fields, clientId: id },
    include: { images: { orderBy: { position: "asc" } } },
  });

  return Response.json(serialize(positioning));
}
