import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const url = typeof body.url === "string" ? body.url : "";
  if (!url) return Response.json({ error: "Imagem inválida" }, { status: 400 });

  const positioning = await prisma.positioning.upsert({
    where: { clientId: id },
    update: {},
    create: { clientId: id },
  });

  const maxPosition = await prisma.positioningImage.aggregate({
    where: { positioningId: positioning.id },
    _max: { position: true },
  });

  const image = await prisma.positioningImage.create({
    data: { url, positioningId: positioning.id, position: (maxPosition._max.position ?? -1) + 1 },
  });

  return Response.json(image, { status: 201 });
}
