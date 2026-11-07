import { requireClientAccess } from "@/lib/authz";
import { getOrCreateNpsForm, getNpsSummary } from "@/lib/nps";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const summary = await getNpsSummary(id);
  return Response.json(summary);
}

/** Garante que o formulário de pesquisa desse cliente existe e devolve o token do link público. */
export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const form = await getOrCreateNpsForm(id);
  return Response.json({ token: form.token });
}
