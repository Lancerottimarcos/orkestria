import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";

type Params = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id, imageId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const result = await prisma.positioningImage.deleteMany({ where: { id: imageId, positioning: { clientId: id } } });
  if (result.count === 0) return Response.json({ error: "Imagem não encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}
