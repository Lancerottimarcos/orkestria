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
  const category = body.category === "application" ? "application" : "reference";

  const keyVisual = await prisma.keyVisual.upsert({
    where: { clientId: id },
    update: {},
    create: { clientId: id },
  });

  const maxPosition = await prisma.keyVisualImage.aggregate({
    where: { keyVisualId: keyVisual.id, category },
    _max: { position: true },
  });

  const image = await prisma.keyVisualImage.create({
    data: { url, category, keyVisualId: keyVisual.id, position: (maxPosition._max.position ?? -1) + 1 },
  });

  return Response.json(image, { status: 201 });
}
