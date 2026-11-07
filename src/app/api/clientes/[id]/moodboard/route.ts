import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { moodboardSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

function load(clientId: string) {
  return prisma.moodboard.findUnique({
    where: { clientId },
    include: { images: { orderBy: { position: "asc" } } },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const moodboard = await load(id);
  return Response.json(moodboard);
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = moodboardSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const fields = { description: data.description || null };

  const moodboard = await prisma.moodboard.upsert({
    where: { clientId: id },
    update: fields,
    create: { ...fields, clientId: id },
    include: { images: { orderBy: { position: "asc" } } },
  });

  return Response.json(moodboard);
}
