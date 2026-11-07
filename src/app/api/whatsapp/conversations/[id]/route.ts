import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

/**
 * Vínculo manual de cliente numa conversa - fallback pra quando o casamento
 * automático por telefone (src/app/api/whatsapp/webhook/route.ts) não bate,
 * ex: cliente escreveu de um número diferente do cadastrado.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("whatsapp");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const clientId = typeof body?.clientId === "string" && body.clientId ? body.clientId : null;

  const conversation = await prisma.whatsAppConversation.findUnique({ where: { id }, select: { id: true } });
  if (!conversation) return Response.json({ error: "Conversa não encontrada" }, { status: 404 });

  if (clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const updated = await prisma.whatsAppConversation.update({
    where: { id },
    data: { clientId },
    include: { client: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return Response.json({ id: updated.id, client: updated.client });
}
