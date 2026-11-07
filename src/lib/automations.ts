import { prisma } from "@/lib/prisma";
import type { ColumnAutomation } from "@/generated/prisma/client";
import { draftCaptionForCard } from "@/lib/ai";

const URGENT_WINDOW_MS = 24 * 60 * 60 * 1000;

async function mentionPrefix(userId: string | null) {
  if (!userId) return "";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user ? `@${user.name} ` : "";
}

async function applyAction(cardId: string, rule: ColumnAutomation) {
  switch (rule.action) {
    case "ASSIGN_MEMBER": {
      if (!rule.assigneeId) break;
      await prisma.kanbanCard.update({ where: { id: cardId }, data: { assigneeId: rule.assigneeId } });
      break;
    }
    case "MARK_DUE_DATE_DONE": {
      await prisma.kanbanCard.update({ where: { id: cardId }, data: { completedAt: new Date() } });
      break;
    }
    case "ADD_COMMENT": {
      const prefix = await mentionPrefix(rule.mentionUserId);
      await prisma.comment.create({
        data: {
          cardId,
          text: `${prefix}${rule.commentText ?? ""}`.trim() || "Comentário automático",
          isAutomated: true,
          mentionedUserId: rule.mentionUserId,
        },
      });
      break;
    }
    case "ADD_CHECKLIST": {
      let items: string[] = [];
      try {
        items = rule.checklistItems ? JSON.parse(rule.checklistItems) : [];
      } catch {
        items = [];
      }
      await prisma.checklist.create({
        data: {
          title: rule.checklistTitle || "Checklist",
          cardId,
          items: { create: items.map((text, i) => ({ text, position: i })) },
        },
      });
      break;
    }
    case "SET_DEMAND_TYPE": {
      if (!rule.setDemandTypeId) break;
      await prisma.kanbanCard.update({ where: { id: cardId }, data: { demandTypeId: rule.setDemandTypeId } });
      break;
    }
    case "MOVE_TO_COLUMN": {
      if (!rule.moveToColumnId) break;
      const maxPosition = await prisma.kanbanCard.aggregate({
        _max: { position: true },
        where: { columnId: rule.moveToColumnId },
      });
      await prisma.kanbanCard.update({
        where: { id: cardId },
        data: { columnId: rule.moveToColumnId, position: (maxPosition._max.position ?? -1) + 1 },
      });
      break;
    }
    case "SET_URGENT": {
      await prisma.kanbanCard.update({ where: { id: cardId }, data: { priority: "HIGH" } });
      break;
    }
    case "CLEAR_URGENT": {
      await prisma.kanbanCard.update({
        where: { id: cardId },
        data: { priority: "MEDIUM", urgentAlerted: false },
      });
      break;
    }
    case "SORT_BY_DUE_DATE": {
      const card = await prisma.kanbanCard.findUnique({ where: { id: cardId } });
      if (!card) break;
      // Cards arquivados continuam fisicamente na coluna (só ficam ocultos
      // na leitura) - sem esse filtro, essa automação reindexava a posição
      // deles junto com os ativos toda vez que rodava.
      const cards = await prisma.kanbanCard.findMany({ where: { columnId: card.columnId, archivedAt: null } });
      const withDate = cards
        .filter((c) => c.dueDate)
        .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
      const withoutDate = cards.filter((c) => !c.dueDate);
      const ordered = [...withDate, ...withoutDate];
      // Só grava .update() em quem realmente mudou de posição - mesmo motivo
      // do fix em src/app/api/kanban/reorder/route.ts: tocar `updatedAt` de
      // cards que já estavam na posição certa reseta o relógio de CARD_IDLE
      // deles como efeito colateral, mesmo sem nenhuma mudança real.
      const reindexUpdates = ordered
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => c.position !== i)
        .map(({ c, i }) => prisma.kanbanCard.update({ where: { id: c.id }, data: { position: i } }));
      if (reindexUpdates.length) await prisma.$transaction(reindexUpdates);
      break;
    }
    case "PROMPT_SCHEDULE": {
      // Sem efeito no servidor: o quadro (client-side) detecta este power-up
      // ativo na coluna de destino e abre o formulário de agendamento para a
      // pessoa escolher rede, data e horário.
      break;
    }
    case "AI_DRAFT_CAPTION": {
      // Chamada externa pode falhar (IA não configurada, rate limit etc) -
      // não deixa isso derrubar o resto do lote de automações do card.
      try {
        const caption = await draftCaptionForCard(cardId);
        await prisma.comment.create({
          data: {
            cardId,
            text: caption
              ? `✨ Rascunho de legenda (IA):\n\n${caption}`
              : "✨ A IA não devolveu nenhum texto - tente gerar de novo.",
            isAutomated: true,
          },
        });
      } catch (err) {
        await prisma.comment.create({
          data: {
            cardId,
            text: `⚠️ Falha ao gerar legenda com IA: ${err instanceof Error ? err.message : "erro desconhecido"}`,
            isAutomated: true,
          },
        });
      }
      break;
    }
  }
}

export async function runColumnAutomations(cardId: string, columnId: string) {
  const rules = await prisma.columnAutomation.findMany({
    where: {
      columnId,
      trigger: "ENTER_COLUMN",
      active: true,
      OR: [{ cardId: null }, { cardId }],
    },
    orderBy: { position: "asc" },
  });
  for (const rule of rules) {
    await applyAction(cardId, rule);
  }
}

export async function runTypeChangeAutomations(cardId: string, demandTypeId: string | null) {
  if (!demandTypeId) return;
  const rules = await prisma.columnAutomation.findMany({
    where: {
      trigger: "TYPE_CHANGED_TO",
      triggerDemandTypeId: demandTypeId,
      active: true,
      OR: [{ cardId: null }, { cardId }],
    },
  });
  for (const rule of rules) {
    await applyAction(cardId, rule);
  }
}

// Throttle em memória do processo (mesmo padrão de "tick ao carregar página"
// já usado por ensureRecurringTransactions) - as duas funções abaixo agora
// rodam a partir do layout compartilhado (toda página de staff), não só
// /kanban, então precisam de um intervalo mínimo pra não bater no banco em
// toda navegação. Reseta sozinho a cada deploy/restart do processo (pm2).
const MIN_TICK_INTERVAL_MS = 5 * 60 * 1000;
let lastUrgentAlertsRunAt = 0;
let lastTimeBasedRunAt = 0;

export async function ensureUrgentAlerts() {
  if (Date.now() - lastUrgentAlertsRunAt < MIN_TICK_INTERVAL_MS) return;
  lastUrgentAlertsRunAt = Date.now();

  const columns = await prisma.kanbanColumn.findMany({ orderBy: { position: "asc" } });
  if (columns.length === 0) return;

  // Última coluna de CADA quadro, não uma única "última" global - com mais
  // de um quadro, só a última coluna do quadro que "vencia" o orderBy
  // global ficava de fora do alerta; cards já prontos na coluna final de
  // todos os outros quadros continuavam virando candidato.
  const lastColumnIdByBoard = new Map<string, string>();
  for (const column of columns) lastColumnIdByBoard.set(column.boardId, column.id);
  const lastColumnIds = [...lastColumnIdByBoard.values()];

  const windowEnd = new Date(Date.now() + URGENT_WINDOW_MS);

  const candidates = await prisma.kanbanCard.findMany({
    where: {
      urgentAlerted: false,
      dueDate: { not: null, lte: windowEnd },
      columnId: { notIn: lastColumnIds },
      completedAt: null,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  for (const card of candidates) {
    await prisma.kanbanCard.update({
      where: { id: card.id },
      data: { priority: "HIGH", urgentAlerted: true },
    });
    await prisma.comment.create({
      data: {
        cardId: card.id,
        text: card.assignee
          ? `⚠️ Prazo esgotando! @${card.assignee.name}, essa demanda vence em breve.`
          : "⚠️ Prazo esgotando! Essa demanda vence em breve.",
        isAutomated: true,
        mentionedUserId: card.assignee?.id ?? null,
      },
    });
  }
}

/**
 * Avalia os power-ups de gatilho por tempo (CARD_IDLE/DUE_DATE_APPROACHING).
 * Sem cron - roda ao abrir /kanban, mesmo padrão já usado por
 * ensureUrgentAlerts(). Dispara uma vez só por card (ColumnAutomationFired),
 * nunca repete a ação enquanto a condição continuar valendo.
 */
export async function runTimeBasedAutomations() {
  if (Date.now() - lastTimeBasedRunAt < MIN_TICK_INTERVAL_MS) return;
  lastTimeBasedRunAt = Date.now();

  const rules = await prisma.columnAutomation.findMany({
    where: {
      active: true,
      trigger: { in: ["CARD_IDLE", "DUE_DATE_APPROACHING"] },
      triggerThresholdDays: { not: null },
    },
  });
  if (rules.length === 0) return;

  const now = new Date();

  for (const rule of rules) {
    const days = rule.triggerThresholdDays!;
    const cards = await prisma.kanbanCard.findMany({
      where: {
        columnId: rule.columnId,
        completedAt: null,
        archivedAt: null,
        ...(rule.cardId ? { id: rule.cardId } : {}),
        // "Parado" usa updatedAt como aproximação de "tempo na coluna" - não
        // existe um enteredColumnAt dedicado hoje, então qualquer edição no
        // card (não só mudar de coluna) reseta o relógio. Aceitável pro
        // propósito do gatilho (sinalizar card esquecido), não uma métrica exata.
        ...(rule.trigger === "CARD_IDLE"
          ? { updatedAt: { lte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) } }
          : { dueDate: { not: null, lte: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) } }),
        automationsFired: { none: { automationId: rule.id } },
      },
      select: { id: true },
    });

    for (const card of cards) {
      // updateMany + count em vez de create direto: se duas avaliações
      // concorrentes chegarem aqui pro mesmo card, só uma aplica a ação -
      // a constraint @@unique([automationId, cardId]) garante isso.
      try {
        await prisma.columnAutomationFired.create({ data: { automationId: rule.id, cardId: card.id } });
      } catch {
        continue; // já disparou (corrida com outra avaliação) - pula
      }
      try {
        await applyAction(card.id, rule);
      } catch (err) {
        // Um card com dado problemático não pode derrubar a avaliação do
        // lote inteiro - sem isso, um erro aqui quebrava o carregamento de
        // /kanban (e agora também da Home/Agendamentos) pra todo mundo.
        console.error(`Falha ao aplicar automação ${rule.id} no card ${card.id}:`, err);
      }
    }
  }
}
