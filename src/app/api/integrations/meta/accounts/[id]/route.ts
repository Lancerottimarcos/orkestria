import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** Desconecta uma conta (o cliente pode reconectar quando quiser). */
export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.socialAccount.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
