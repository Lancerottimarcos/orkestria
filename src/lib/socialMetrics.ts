/**
 * Sincronização e leitura de métricas (Instagram/Facebook) via Graph API da
 * Meta - de conta e de post publicado pelo Orkestrya. Sem dependência do
 * singleton `@/lib/prisma`: recebe o PrismaClient por parâmetro pra poder
 * rodar tanto dentro do app Next.js quanto dentro do worker
 * (scripts/publish-worker.ts, processo à parte com sua própria instância de
 * PrismaClient - mesmo padrão de src/lib/meta.ts, que também não importa
 * nada com "@/").
 */
import { decryptSecret } from "./crypto";
import {
  fetchInstagramAccountInfo,
  fetchInstagramInsights,
  fetchFacebookPageInfo,
  fetchFacebookPageInsights,
  fetchInstagramMediaInsights,
  fetchFacebookPostInsights,
} from "./meta";
import type { PrismaClient } from "../generated/prisma/client";

function truncateToDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Roda a cada tick do worker. Só chama a Graph API pras contas que ainda não
 * têm snapshot de hoje - autolimitado a 1x/dia por conta sem precisar de
 * agendamento próprio.
 */
export async function syncDueSocialMetrics(db: PrismaClient): Promise<void> {
  const today = truncateToDay(new Date());
  const accounts = await db.socialAccount.findMany({
    where: { platform: { in: ["INSTAGRAM", "FACEBOOK"] }, status: "ACTIVE" },
  });

  for (const account of accounts) {
    const existing = await db.socialMetricSnapshot.findUnique({
      where: { socialAccountId_date: { socialAccountId: account.id, date: today } },
    });
    if (existing) continue;

    try {
      const token = decryptSecret(account.accessTokenEnc);

      if (account.platform === "INSTAGRAM") {
        const [info, insights] = await Promise.all([
          fetchInstagramAccountInfo(account.externalAccountId, token),
          fetchInstagramInsights(account.externalAccountId, token),
        ]);
        await db.socialMetricSnapshot.create({
          data: {
            socialAccountId: account.id,
            date: today,
            followers: info.followersCount,
            mediaCount: info.mediaCount,
            reach: insights.reach,
            impressions: insights.impressions,
            profileViews: insights.profileViews,
            engagedAccounts: insights.engagedAccounts,
            totalInteractions: insights.totalInteractions,
            profileLinkTaps: insights.profileLinkTaps,
            likes: insights.likes,
            comments: insights.comments,
            shares: insights.shares,
            saves: insights.saves,
            raw: JSON.stringify(insights.raw ?? null),
          },
        });
      } else {
        const [info, insights] = await Promise.all([
          fetchFacebookPageInfo(account.externalAccountId, token),
          fetchFacebookPageInsights(account.externalAccountId, token),
        ]);
        await db.socialMetricSnapshot.create({
          data: {
            socialAccountId: account.id,
            date: today,
            followers: info.followers,
            mediaCount: null,
            reach: insights.reach,
            impressions: insights.impressions,
            profileViews: insights.profileViews,
            engagedAccounts: insights.engagedAccounts,
            totalInteractions: insights.totalInteractions,
            profileLinkTaps: insights.profileLinkTaps,
            likes: insights.likes,
            comments: insights.comments,
            shares: insights.shares,
            saves: insights.saves,
            raw: JSON.stringify(insights.raw ?? null),
          },
        });
      }
    } catch (err) {
      console.error(
        `[socialMetrics] falha ao sincronizar conta ${account.id} (${account.platform}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

const POST_METRICS_WINDOW_DAYS = 30;

/**
 * Métricas por post - só dos publicados pelo Orkestrya no Instagram/Facebook
 * nos últimos 30 dias (limite deliberado: posts mais antigos já estabilizam
 * o desempenho e cada um custa uma chamada extra à Graph API por dia até ter
 * snapshot). Mesmo autolimite de 1x/dia por post que o snapshot de conta.
 */
export async function syncDuePostMetrics(db: PrismaClient): Promise<void> {
  const today = truncateToDay(new Date());
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - POST_METRICS_WINDOW_DAYS);

  const cards = await db.kanbanCard.findMany({
    where: {
      publishStatus: "PUBLISHED",
      externalPostId: { not: null },
      publishedAt: { gte: since },
      scheduledNetwork: { in: ["INSTAGRAM", "FACEBOOK"] },
      socialAccountId: { not: null },
    },
    include: { socialAccount: true },
  });

  for (const card of cards) {
    if (!card.socialAccount || !card.externalPostId) continue;

    const existing = await db.postMetricSnapshot.findUnique({
      where: { kanbanCardId_date: { kanbanCardId: card.id, date: today } },
    });
    if (existing) continue;

    try {
      const token = decryptSecret(card.socialAccount.accessTokenEnc);
      const insights =
        card.scheduledNetwork === "INSTAGRAM"
          ? await fetchInstagramMediaInsights(card.externalPostId, token)
          : await fetchFacebookPostInsights(card.externalPostId, token);

      await db.postMetricSnapshot.create({
        data: {
          kanbanCardId: card.id,
          date: today,
          impressions: insights.impressions,
          reach: insights.reach,
          likes: insights.likes,
          comments: insights.comments,
          shares: insights.shares,
          saves: insights.saves,
          videoViews: insights.videoViews,
          raw: JSON.stringify(insights.raw ?? null),
        },
      });
    } catch (err) {
      console.error(
        `[socialMetrics] falha ao sincronizar post ${card.id} (${card.scheduledNetwork}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export type MetricKpi = {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  changePct: number | null;
};

export type ClientMetricsPlatform = {
  platform: "INSTAGRAM" | "FACEBOOK";
  accountName: string;
  followers: number | null;
  followersDelta: number | null;
  mediaCount: number | null;
  kpis: MetricKpi[];
  series: {
    date: string;
    followers: number | null;
    reach: number | null;
    impressions: number | null;
    profileViews: number | null;
    engagedAccounts: number | null;
    totalInteractions: number | null;
    profileLinkTaps: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  }[];
  /**
   * "pending": conta conectada, ainda sem nenhum snapshot (sincroniza no
   * próximo tick do worker, em até 1 minuto). "needs_reconnect": tem
   * snapshot(s) mas nenhuma métrica de insights veio em nenhum deles - sinal
   * de token sem a permissão nova, precisa reconectar. "ok": tem pelo menos
   * um valor real de insights em algum snapshot.
   */
  status: "ok" | "pending" | "needs_reconnect";
  recentPosts: {
    id: string;
    title: string;
    publishedAt: string;
    impressions: number | null;
    reach: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
    videoViews: number | null;
  }[];
};

export type ClientMetrics = {
  platforms: ClientMetricsPlatform[];
  /** Redes conectadas e ativas pro cliente, mas fora do Instagram/Facebook - hoje sem sincronização de métricas. */
  otherConnectedNetworks: string[];
};

type Snapshot = {
  date: Date;
  followers: number | null;
  mediaCount: number | null;
  reach: number | null;
  impressions: number | null;
  profileViews: number | null;
  engagedAccounts: number | null;
  totalInteractions: number | null;
  profileLinkTaps: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
};

function sumField(snapshots: Snapshot[], key: keyof Snapshot): number | null {
  const values = snapshots.map((s) => s[key]).filter((v): v is number => typeof v === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

const METRIC_WINDOW_DAYS = 30;

/** Lê os últimos 30 dias de snapshot de um cliente (conta + posts) com comparação vs período anterior, já formatado pra UI. */
export async function getClientMetrics(db: PrismaClient, clientId: string): Promise<ClientMetrics> {
  const today = truncateToDay(new Date());
  const periodStart = new Date(today);
  periodStart.setUTCDate(periodStart.getUTCDate() - (METRIC_WINDOW_DAYS - 1));
  const previousPeriodStart = new Date(periodStart);
  previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - METRIC_WINDOW_DAYS);

  const [accounts, otherAccounts, posts] = await Promise.all([
    db.socialAccount.findMany({
      where: { clientId, platform: { in: ["INSTAGRAM", "FACEBOOK"] } },
      include: {
        metricSnapshots: {
          where: { date: { gte: previousPeriodStart } },
          orderBy: { date: "asc" },
        },
      },
    }),
    db.socialAccount.findMany({
      where: { clientId, platform: { notIn: ["INSTAGRAM", "FACEBOOK"] }, status: "ACTIVE" },
      select: { platform: true },
    }),
    db.kanbanCard.findMany({
      where: {
        clientId,
        publishStatus: "PUBLISHED",
        externalPostId: { not: null },
        publishedAt: { gte: periodStart },
        scheduledNetwork: { in: ["INSTAGRAM", "FACEBOOK"] },
      },
      include: { metricSnapshots: { orderBy: { date: "desc" }, take: 1 } },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const platforms: ClientMetricsPlatform[] = accounts.map((account) => {
    const current = account.metricSnapshots.filter((s) => s.date >= periodStart);
    const previous = account.metricSnapshots.filter((s) => s.date < periodStart);
    const latest = current[current.length - 1] ?? null;
    const latestPrevious = previous[previous.length - 1] ?? null;
    const followersDelta =
      latest?.followers != null && latestPrevious?.followers != null
        ? latest.followers - latestPrevious.followers
        : null;
    const hasAnyInsight = current.some(
      (s) => s.reach != null || s.profileViews != null || s.engagedAccounts != null || s.impressions != null,
    );

    const kpis: MetricKpi[] = [
      {
        key: "followers",
        label: "Seguidores",
        current: latest?.followers ?? null,
        previous: latestPrevious?.followers ?? null,
        changePct: pctChange(latest?.followers ?? null, latestPrevious?.followers ?? null),
      },
      {
        key: "reach",
        label: "Alcance",
        current: sumField(current, "reach"),
        previous: sumField(previous, "reach"),
        changePct: pctChange(sumField(current, "reach"), sumField(previous, "reach")),
      },
      {
        key: "engagedAccounts",
        label: "Contas engajadas",
        current: sumField(current, "engagedAccounts"),
        previous: sumField(previous, "engagedAccounts"),
        changePct: pctChange(sumField(current, "engagedAccounts"), sumField(previous, "engagedAccounts")),
      },
      {
        key: "totalInteractions",
        label: "Interações totais",
        current: sumField(current, "totalInteractions"),
        previous: sumField(previous, "totalInteractions"),
        changePct: pctChange(sumField(current, "totalInteractions"), sumField(previous, "totalInteractions")),
      },
    ];

    const recentPosts = posts
      .filter((p) => p.scheduledNetwork === account.platform)
      .map((p) => {
        const m = p.metricSnapshots[0] ?? null;
        return {
          id: p.id,
          title: p.title,
          publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
          impressions: m?.impressions ?? null,
          reach: m?.reach ?? null,
          likes: m?.likes ?? null,
          comments: m?.comments ?? null,
          shares: m?.shares ?? null,
          saves: m?.saves ?? null,
          videoViews: m?.videoViews ?? null,
        };
      });

    return {
      platform: account.platform as "INSTAGRAM" | "FACEBOOK",
      accountName: account.name,
      followers: latest?.followers ?? null,
      followersDelta,
      mediaCount: latest?.mediaCount ?? null,
      kpis,
      series: current.map((s) => ({
        date: s.date.toISOString(),
        followers: s.followers,
        reach: s.reach,
        impressions: s.impressions,
        profileViews: s.profileViews,
        engagedAccounts: s.engagedAccounts,
        totalInteractions: s.totalInteractions,
        profileLinkTaps: s.profileLinkTaps,
        likes: s.likes,
        comments: s.comments,
        shares: s.shares,
        saves: s.saves,
      })),
      status: current.length === 0 ? "pending" : hasAnyInsight ? "ok" : "needs_reconnect",
      recentPosts,
    };
  });

  const otherConnectedNetworks = [...new Set(otherAccounts.map((a) => a.platform))];

  return { platforms, otherConnectedNetworks };
}
