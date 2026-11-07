import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

/** Abre um registro de visualização (heatmap) ao montar a página pública - atualizado depois via PATCH .../[viewId]. */
export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;

  const proposal = await prisma.salesProposal.findUnique({ where: { token }, select: { id: true } });
  if (!proposal) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  const view = await prisma.proposalView.create({ data: { proposalId: proposal.id }, select: { id: true } });
  return Response.json(view, { status: 201 });
}
