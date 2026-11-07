import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { draftCaptionForCard } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

/** Gera um rascunho de legenda com IA sob demanda (fora de um power-up) - mesmo motor, e fica salvo como comentário igual o automático. */
export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  try {
    const caption = await draftCaptionForCard(id);
    const comment = await prisma.comment.create({
      data: {
        cardId: id,
        text: caption ? `✨ Rascunho de legenda (IA):\n\n${caption}` : "✨ A IA não devolveu nenhum texto - tente de novo.",
        isAutomated: true,
      },
      include: {
        author: { select: { id: true, name: true } },
        mentionedUser: { select: { id: true, name: true } },
      },
    });
    return Response.json(comment);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao gerar legenda" }, { status: 400 });
  }
}
