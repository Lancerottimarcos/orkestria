import { prisma } from "@/lib/prisma";
import { proposalDecisionSchema } from "@/lib/schemas";
import { decideProposal } from "@/lib/proposals/pipeline";
import { getPublicProposal } from "@/lib/proposals/publicView";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const proposal = await getPublicProposal(token);
  if (!proposal) {
    return Response.json({ error: "Proposta não encontrada" }, { status: 404 });
  }

  return Response.json(proposal);
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const parsed = proposalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const proposal = await prisma.salesProposal.findUnique({ where: { token }, select: { id: true } });
  if (!proposal) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  const result = await decideProposal(proposal.id, parsed.data.action, {
    signerName: parsed.data.signerName,
    message: parsed.data.message,
  });
  if ("error" in result) {
    const status = result.error === "expired" ? 400 : 404;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json(await getPublicProposal(token));
}
