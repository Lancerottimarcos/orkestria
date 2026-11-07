import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireModule("kanban");
  if (error) return error;

  const { commentId } = await params;
  const comment = await prisma.comment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment) return Response.json({ error: "Comentário não encontrado" }, { status: 404 });

  if (comment.authorId !== session!.user.id && session!.user.role !== "ADMIN") {
    return Response.json({ error: "Só quem comentou (ou um admin) pode remover" }, { status: 403 });
  }

  await prisma.comment.delete({ where: { id: commentId } });
  return Response.json({ ok: true });
}
