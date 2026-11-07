import { prisma } from "@/lib/prisma";
import { proposalViewSchema } from "@/lib/schemas";

type Params = { params: Promise<{ token: string; viewId: string }> };

/**
 * Atualiza duração/scroll de uma visualização já aberta - chamado via
 * navigator.sendBeacon no unload/visibilitychange da proposta pública.
 * POST (não PATCH) porque sendBeacon só envia POST.
 */
export async function POST(request: Request, { params }: Params) {
  const { token, viewId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = proposalViewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const view = await prisma.proposalView.findUnique({ where: { id: viewId }, select: { id: true, proposal: { select: { token: true } } } });
  if (!view || view.proposal.token !== token) {
    return Response.json({ error: "Visualização não encontrada" }, { status: 404 });
  }

  await prisma.proposalView.update({
    where: { id: viewId },
    data: { durationSeconds: parsed.data.durationSeconds, maxScrollPercent: parsed.data.maxScrollPercent },
  });

  return Response.json({ ok: true });
}
