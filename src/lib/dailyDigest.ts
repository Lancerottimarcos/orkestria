// Import relativo (não @/...) de propósito - este arquivo também é chamado
// pelo scripts/publish-worker.ts, fora do bundler do Next.js, mesmo padrão
// já usado em socialMetrics.ts pelo mesmo motivo.
import type { PrismaClient } from "../generated/prisma/client";

const DIGEST_CHANNEL_NAME = "Resumo Diário";
const DIGEST_HOUR = 8; // horário local do processo (VPS) em que o resumo é postado

async function getOrCreateDigestChannel(prisma: PrismaClient) {
  const existing = await prisma.chatChannel.findFirst({ where: { name: DIGEST_CHANNEL_NAME, kind: "GROUP" } });
  if (existing) return existing;

  const staff = await prisma.user.findMany({ where: { active: true }, select: { id: true } });
  return prisma.chatChannel.create({
    data: {
      name: DIGEST_CHANNEL_NAME,
      kind: "GROUP",
      members: { create: staff.map((u) => ({ userId: u.id })) },
    },
  });
}

/**
 * `members` do canal "Resumo Diário" só era preenchido na criação do canal
 * (uma vez só, na primeira vez que o resumo rodou) - todo funcionário
 * contratado depois disso nunca era adicionado, e sem estar na lista de
 * membros um MEMBER comum nem enxerga que o canal existe (staffChannelVisibilityWhere
 * exige ser membro pra ver um canal GROUP). Chamado na criação de usuário
 * staff (src/app/api/usuarios/route.ts) pra fechar esse gap dali em diante.
 */
export async function ensureDigestChannelMembership(prisma: PrismaClient, userId: string) {
  const channel = await prisma.chatChannel.findFirst({ where: { name: DIGEST_CHANNEL_NAME, kind: "GROUP" }, select: { id: true } });
  if (!channel) return; // canal ainda não existe - nasce com todo staff ativo quando o primeiro resumo rodar
  const existing = await prisma.chatChannelMember.findFirst({ where: { channelId: channel.id, userId } });
  if (existing) return;
  await prisma.chatChannelMember.create({ data: { channelId: channel.id, userId } });
}

/**
 * Resumo diário automático no chat interno - roda dentro do worker que já
 * existe (scripts/publish-worker.ts, tick a cada 60s), sem processo/cron
 * novo. Só posta uma vez por dia (marcado via ActivityLog action
 * "daily_digest"), na primeira vez que o tick cruzar DIGEST_HOUR.
 */
export async function sendDailyDigestIfDue(prisma: PrismaClient) {
  const now = new Date();
  // ">=" em vez de "===": se o worker ficar fora do ar durante a hora exata
  // do resumo (deploy, crash, restart demorado) e só voltar mais tarde no
  // mesmo dia, ainda assim envia - antes disso, ficar fora do ar durante
  // aquela hora específica perdia o resumo do dia inteiro, sem recuperação
  // nenhuma. O guard de "alreadySent" abaixo já impede duplicar.
  if (now.getHours() < DIGEST_HOUR) return;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const alreadySent = await prisma.activityLog.findFirst({
    where: { action: "daily_digest", createdAt: { gte: todayStart } },
  });
  if (alreadySent) return;

  const [overdueCards, pendingApprovals, overdueTx] = await Promise.all([
    prisma.kanbanCard.count({
      where: { completedAt: null, archivedAt: null, dueDate: { not: null, lt: now } },
    }),
    prisma.post.count({ where: { status: "PENDING" } }),
    prisma.transaction.count({
      where: { OR: [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: now } }] },
    }),
  ]);

  if (overdueCards === 0 && pendingApprovals === 0 && overdueTx === 0) {
    // Sem nada relevante pra avisar - não posta mensagem vazia todo dia só
    // pra dizer "está tudo bem", mas ainda marca como enviado pra não checar de novo hoje.
    await prisma.activityLog.create({ data: { action: "daily_digest", entityType: "ChatChannel", summary: "Resumo diário: nada pendente" } });
    return;
  }

  const lines = [`☀️ Bom dia! Resumo do dia:`];
  if (overdueCards > 0) lines.push(`• ${overdueCards} demanda(s) com prazo vencido no Kanban`);
  if (pendingApprovals > 0) lines.push(`• ${pendingApprovals} conteúdo(s) aguardando aprovação`);
  if (overdueTx > 0) lines.push(`• ${overdueTx} lançamento(s) financeiro(s) em atraso`);

  const channel = await getOrCreateDigestChannel(prisma);
  await prisma.chatMessage.create({ data: { channelId: channel.id, text: lines.join("\n") } });
  await prisma.activityLog.create({ data: { action: "daily_digest", entityType: "ChatChannel", entityId: channel.id, summary: "Resumo diário postado no chat" } });
}
