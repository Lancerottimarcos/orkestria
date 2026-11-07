import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const { id } = await params;
  // Idempotente: excluir duas vezes o mesmo link (duplo clique, duas abas)
  // não deve estourar 500 cru - já excluído já é o resultado que a pessoa queria.
  const result = await prisma.shortLink.deleteMany({ where: { id } });
  if (result.count === 0) return Response.json({ error: "Link não encontrado" }, { status: 404 });
  return Response.json({ ok: true });
}
