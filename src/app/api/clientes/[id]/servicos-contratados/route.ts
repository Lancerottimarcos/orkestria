import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { contractedServiceSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const services = await prisma.contractedService.findMany({
    where: { clientId: id },
    orderBy: { startDate: "desc" },
  });
  return Response.json(services);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = contractedServiceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const service = await prisma.contractedService.create({
    data: {
      name: data.name,
      scope: data.scope || null,
      value: data.value,
      period: data.period,
      startDate: new Date(data.startDate),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
      clientId: id,
    },
  });

  // "Contratos" é escopo explícito da trilha de atividade, mas o valor/
  // período efetivamente cobrado do cliente nasce aqui, não só na
  // contra-assinatura da agência (que já era logada).
  await logActivity({
    action: "create",
    entityType: "ContractedService",
    entityId: service.id,
    summary: `Serviço contratado "${service.name}" adicionado`,
    userId: session!.user.id,
  });

  return Response.json(service, { status: 201 });
}
