import { prisma } from "@/lib/prisma";

/**
 * Registra uma ação na trilha de auditoria geral. Chamado nas ações de maior
 * impacto (cliente, contrato, financeiro) - não em todo clique do sistema,
 * senão a tabela vira ruído e ninguém lê.
 */
export async function logActivity(params: {
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  userId?: string | null;
}) {
  await prisma.activityLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      summary: params.summary,
      userId: params.userId ?? null,
    },
  });
}
