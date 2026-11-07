import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } });
  if (!entry) return Response.json({ error: "Apontamento não encontrado" }, { status: 404 });

  if (entry.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return Response.json({ error: "Só quem apontou (ou um admin) pode remover" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id } });
  return Response.json({ ok: true });
}
