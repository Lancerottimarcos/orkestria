import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { keyVisualSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

async function load(clientId: string) {
  const keyVisual = await prisma.keyVisual.findUnique({
    where: { clientId },
    include: { images: { orderBy: { position: "asc" } } },
  });
  return serialize(keyVisual);
}

function serialize<T extends { colors: string | null } | null>(keyVisual: T) {
  if (!keyVisual) return keyVisual;
  let colors: string[] = [];
  try {
    colors = keyVisual.colors ? JSON.parse(keyVisual.colors) : [];
  } catch {
    colors = [];
  }
  return { ...keyVisual, colors };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const keyVisual = await load(id);
  return Response.json(keyVisual);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = keyVisualSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const fields = {
    logoUrl: data.logoUrl || null,
    colors: data.colors && data.colors.length > 0 ? JSON.stringify(data.colors) : null,
    primaryFont: data.primaryFont || null,
    secondaryFont: data.secondaryFont || null,
    layoutNotes: data.layoutNotes || null,
    guidelines: data.guidelines || null,
    doNotes: data.doNotes || null,
    dontNotes: data.dontNotes || null,
  };

  const keyVisual = await prisma.keyVisual.upsert({
    where: { clientId: id },
    update: fields,
    create: { ...fields, clientId: id },
    include: { images: { orderBy: { position: "asc" } } },
  });

  return Response.json(serialize(keyVisual));
}
