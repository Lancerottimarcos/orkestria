import { prisma } from "@/lib/prisma";
import { proposalSignSchema } from "@/lib/schemas";
import { signProposalContracts } from "@/lib/proposals/pipeline";
import { getPublicProposal } from "@/lib/proposals/publicView";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const parsed = proposalSignSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proposal = await prisma.salesProposal.findUnique({ where: { token }, select: { id: true } });
  if (!proposal) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  const result = await signProposalContracts(proposal.id, parsed.data);
  if ("error" in result) {
    const status = result.error === "not_ready" ? 400 : 409;
    return Response.json({ error: result.error }, { status });
  }

  // portalAccess só existe nessa resposta - a senha em texto puro não fica
  // salva em lugar nenhum, o cliente precisa ver agora.
  return Response.json({ ...(await getPublicProposal(token)), portalAccess: result.portalAccess });
}
