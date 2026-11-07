import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { getClientMetrics } from "@/lib/socialMetrics";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const metrics = await getClientMetrics(prisma, id);
  return Response.json(metrics);
}
