import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string; serviceId: string }> };

/**
 * Contra-assinatura interna da agência - só depois que o cliente já assinou.
 * Admin-only de propósito: é uma confirmação de que a agência revisou o
 * contrato, não uma ação de rotina do módulo "clientes" (que qualquer MEMBER
 * com o módulo liberado poderia disparar).
 */
export async function POST(_request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { serviceId } = await params;
  const service = await prisma.contractedService.findUnique({ where: { id: serviceId }, select: { signedAt: true, agencySignedAt: true } });
  if (!service) return Response.json({ error: "Serviço não encontrado" }, { status: 404 });
  if (!service.signedAt) return Response.json({ error: "O cliente ainda não assinou este contrato" }, { status: 400 });
  if (service.agencySignedAt) return Response.json({ error: "Já assinado pela agência" }, { status: 400 });

  const updated = await prisma.contractedService.update({
    where: { id: serviceId },
    data: { agencySignedAt: new Date(), agencySignerName: session!.user.name ?? "Administrador" },
  });

  await logActivity({
    action: "sign",
    entityType: "ContractedService",
    entityId: serviceId,
    summary: `Contra-assinatura da agência em "${updated.name}"`,
    userId: session!.user.id,
  });

  return Response.json(updated);
}
