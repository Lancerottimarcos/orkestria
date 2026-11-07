import { requireModule } from "@/lib/authz";
import { proposalDecisionSchema } from "@/lib/schemas";
import { decideProposal } from "@/lib/proposals/pipeline";

type Params = { params: Promise<{ id: string }> };

/** Admin registra uma decisão tomada fora do link público (ex.: cliente aceitou por telefone) - passa pelo mesmo pipeline do aceite público. */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("propostas");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = proposalDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await decideProposal(id, parsed.data.action, {
    signerName: parsed.data.signerName,
    message: parsed.data.message,
  });
  if ("error" in result) {
    const status = result.error === "expired" ? 400 : 404;
    return Response.json({ error: result.error }, { status });
  }

  return Response.json(result.proposal);
}
