import { prisma } from "@/lib/prisma";

const NPS_FIELD_LABEL = "De 1 a 5, o quanto você está satisfeito com o trabalho da agência?";
const NPS_COMMENT_LABEL = "Quer deixar algum comentário? (opcional)";

/** Acha (ou cria na primeira vez) o formulário de pesquisa de satisfação desse cliente - reaproveita o motor de formulário já existente, sem sistema novo. */
export async function getOrCreateNpsForm(clientId: string) {
  const existing = await prisma.customForm.findFirst({
    where: { clientId, isNpsTemplate: true },
    select: { id: true, token: true },
  });
  if (existing) return existing;

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });

  return prisma.customForm.create({
    data: {
      title: `Pesquisa de satisfação - ${client?.name ?? "cliente"}`,
      clientId,
      isNpsTemplate: true,
      fields: {
        create: [
          { label: NPS_FIELD_LABEL, type: "RATING", required: true, position: 0 },
          { label: NPS_COMMENT_LABEL, type: "TEXTAREA", required: false, position: 1 },
        ],
      },
    },
    select: { id: true, token: true },
  });
}

export type NpsSummary = { average: number | null; responseCount: number; trend: { date: string; score: number }[] };

/** Média e histórico de respostas da pesquisa de satisfação desse cliente. */
export async function getNpsSummary(clientId: string): Promise<NpsSummary> {
  const form = await prisma.customForm.findFirst({
    where: { clientId, isNpsTemplate: true },
    select: {
      fields: { where: { type: "RATING" }, select: { id: true } },
      submissions: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, responses: { select: { fieldId: true, value: true } } },
      },
    },
  });
  if (!form || form.fields.length === 0) return { average: null, responseCount: 0, trend: [] };

  const ratingFieldId = form.fields[0].id;
  const trend = form.submissions
    .map((s) => {
      const response = s.responses.find((r) => r.fieldId === ratingFieldId);
      const score = response ? Number(response.value) : null;
      return score && !Number.isNaN(score) ? { date: s.createdAt.toISOString(), score } : null;
    })
    .filter((t): t is { date: string; score: number } => t !== null);

  const average = trend.length > 0 ? trend.reduce((sum, t) => sum + t.score, 0) / trend.length : null;

  return { average, responseCount: trend.length, trend };
}
