import { prisma } from "@/lib/prisma";
import type { SocialNetwork } from "@/generated/prisma/client";

export type RankedContent = {
  cardId: string;
  title: string;
  clientName: string;
  network: SocialNetwork;
  publishedAt: string;
  engagement: number;
  reach: number | null;
  likes: number | null;
  comments: number | null;
};

/** Ranking dos posts publicados com melhor engajamento no período, cruzando todos os clientes - não existia visão consolidada até aqui, só por conta isolada. */
export async function computeContentRanking(monthsBack = 1, limit = 20): Promise<RankedContent[]> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - monthsBack * 30);

  const cards = await prisma.kanbanCard.findMany({
    where: { publishedAt: { gte: periodStart, not: null }, client: { isNot: null }, scheduledNetwork: { not: null } },
    select: {
      id: true,
      title: true,
      scheduledNetwork: true,
      publishedAt: true,
      client: { select: { name: true } },
      metricSnapshots: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const ranked = cards
    .map((c) => {
      const snap = c.metricSnapshots[0];
      if (!snap) return null;
      const engagement = (snap.likes ?? 0) + (snap.comments ?? 0) + (snap.shares ?? 0) + (snap.saves ?? 0);
      return {
        cardId: c.id,
        title: c.title,
        clientName: c.client!.name,
        network: c.scheduledNetwork!,
        publishedAt: c.publishedAt!.toISOString(),
        engagement,
        reach: snap.reach,
        likes: snap.likes,
        comments: snap.comments,
      };
    })
    .filter((r): r is RankedContent => r !== null && r.engagement > 0)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limit);

  return ranked;
}
