import { prisma } from "@/lib/prisma";

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Mínimo de posts na rede pra sequer tentar calcular - por si só não garante
// amostra boa por bucket (dia/hora), só evita calcular com quase nada.
const MIN_SAMPLE = 8;
// Um bucket vencedor com poucos posts é, na prática, o horário do post de
// maior engajamento bruto (possivelmente um outlier de reach), não uma
// média confiável - abaixo disso, sinaliza baixa confiança em vez de
// apresentar o resultado como se fosse estatisticamente sólido.
const MIN_BUCKET_FOR_CONFIDENCE = 3;

export type BestPostTime = { network: string; sampleSize: number; bestDay: string; bestHour: number; confidence: "low" | "high" };

/** Melhor dia/horário por rede, calculado a partir dos posts já publicados e das métricas reais coletadas - não é referência genérica de mercado. */
export async function computeBestPostTimes(clientId: string): Promise<BestPostTime[]> {
  const cards = await prisma.kanbanCard.findMany({
    where: { clientId, publishedAt: { not: null }, scheduledNetwork: { not: null } },
    select: {
      scheduledNetwork: true,
      publishedAt: true,
      metricSnapshots: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const byNetwork = new Map<string, { publishedAt: Date; engagement: number }[]>();
  for (const c of cards) {
    const snap = c.metricSnapshots[0];
    if (!c.publishedAt || !c.scheduledNetwork) continue;
    const engagement = snap
      ? (snap.likes ?? 0) + (snap.comments ?? 0) + (snap.shares ?? 0) + (snap.saves ?? 0) + (snap.reach ?? 0) * 0.1
      : 0;
    const list = byNetwork.get(c.scheduledNetwork) ?? [];
    list.push({ publishedAt: c.publishedAt, engagement });
    byNetwork.set(c.scheduledNetwork, list);
  }

  const results: BestPostTime[] = [];
  for (const [network, posts] of byNetwork) {
    if (posts.length < MIN_SAMPLE) continue;

    const dayBuckets = new Map<number, { sum: number; count: number }>();
    const hourBuckets = new Map<number, { sum: number; count: number }>();
    for (const p of posts) {
      const day = p.publishedAt.getDay();
      const hour = p.publishedAt.getHours();
      const d = dayBuckets.get(day) ?? { sum: 0, count: 0 };
      d.sum += p.engagement;
      d.count += 1;
      dayBuckets.set(day, d);
      const h = hourBuckets.get(hour) ?? { sum: 0, count: 0 };
      h.sum += p.engagement;
      h.count += 1;
      hourBuckets.set(hour, h);
    }

    const bestDay = [...dayBuckets.entries()].sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)[0];
    const bestHour = [...hourBuckets.entries()].sort((a, b) => b[1].sum / b[1].count - a[1].sum / a[1].count)[0];
    const confidence: "low" | "high" =
      bestDay[1].count >= MIN_BUCKET_FOR_CONFIDENCE && bestHour[1].count >= MIN_BUCKET_FOR_CONFIDENCE ? "high" : "low";

    results.push({
      network,
      sampleSize: posts.length,
      bestDay: DAY_NAMES[bestDay[0]],
      bestHour: bestHour[0],
      confidence,
    });
  }

  return results.sort((a, b) => b.sampleSize - a.sampleSize);
}
