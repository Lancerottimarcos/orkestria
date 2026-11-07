import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { contractedServiceSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string; serviceId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, serviceId } = await params;
  const { session, error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = contractedServiceSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const result = await prisma.contractedService.updateMany({
    where: { id: serviceId, clientId: id },
    data: {
      name: data.name,
      scope: data.scope || null,
      value: data.value,
      period: data.period,
      startDate: new Date(data.startDate),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
    },
  });
  if (result.count === 0) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });

  const service = await prisma.contractedService.findUnique({ where: { id: serviceId } });
  await logActivity({
    action: "update",
    entityType: "ContractedService",
    entityId: serviceId,
    summary: `Serviço contratado "${data.name}" editado`,
    userId: session!.user.id,
  });
  return Response.json(service);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, serviceId } = await params;
  const { session, error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const existing = await prisma.contractedService.findUnique({ where: { id: serviceId }, select: { name: true } });
  const result = await prisma.contractedService.deleteMany({ where: { id: serviceId, clientId: id } });
  if (result.count === 0) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });

  await logActivity({
    action: "delete",
    entityType: "ContractedService",
    entityId: serviceId,
    summary: `Serviço contratado "${existing?.name ?? serviceId}" excluído`,
    userId: session!.user.id,
  });
  return Response.json({ ok: true });
}
