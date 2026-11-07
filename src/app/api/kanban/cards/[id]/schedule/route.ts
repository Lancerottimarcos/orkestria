import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { applyCardSchedule, VALID_NETWORKS, type ScheduleNetwork } from "@/lib/kanbanSchedule";

type Params = { params: Promise<{ id: string }> };

/** Define ou limpa o agendamento de publicação de uma demanda. body: { network: string | null, scheduledAt: string | null } */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const network = body?.network ?? null;
  const scheduledAtRaw = body?.scheduledAt ?? null;

  if (network !== null && !VALID_NETWORKS.includes(network)) {
    return Response.json({ error: "Rede social inválida" }, { status: 400 });
  }
  if (scheduledAtRaw !== null && Number.isNaN(new Date(scheduledAtRaw).getTime())) {
    return Response.json({ error: "Data de agendamento inválida" }, { status: 400 });
  }

  const exists = await prisma.kanbanCard.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return Response.json({ error: "Demanda não encontrada" }, { status: 404 });

  const result = await applyCardSchedule(
    id,
    network as ScheduleNetwork | null,
    scheduledAtRaw ? new Date(scheduledAtRaw) : null,
  );
  return Response.json(result!.card, { status: result!.status });
}
