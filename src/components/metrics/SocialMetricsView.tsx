"use client";

import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
  BarChart3,
  Newspaper,
  UserPlus,
  Eye,
  Users2,
  Zap,
  Layers,
  Radar,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { SocialIcon } from "@/components/kanban/SocialIcons";
import { SOCIAL_NETWORK_COLORS, SOCIAL_NETWORK_LABELS, networkShapeBackground } from "@/lib/socialNetworks";
import { MetricAreaChart } from "./MetricAreaChart";
import { Sparkline } from "./Sparkline";
import { CountUp } from "./CountUp";
import type { ClientMetrics, ClientMetricsPlatform } from "@/lib/socialMetrics";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

function num(value: number | null): string {
  return value != null ? value.toLocaleString("pt-BR") : "-";
}

function chipStyle(color: string) {
  return { background: `color-mix(in srgb, ${color} 15%, transparent)`, color };
}

function delayStyle(index: number, stepMs = 60) {
  return { animationDelay: `${index * stepMs}ms` };
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct == null) return null;
  const isUp = changePct > 0;
  const isDown = changePct < 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
        isUp ? "bg-success/15 text-success" : isDown ? "bg-danger/15 text-danger" : "bg-surface-2 text-muted",
      )}
    >
      {isUp && <TrendingUp size={10} />}
      {isDown && <TrendingDown size={10} />}
      {Math.abs(changePct).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

const KPI_ICONS: Record<string, typeof UserPlus> = {
  followers: UserPlus,
  reach: Eye,
  engagedAccounts: Users2,
  totalInteractions: Zap,
};
const KPI_COLORS: Record<string, string> = {
  followers: "var(--color-accent)",
  reach: "var(--color-chart-1)",
  engagedAccounts: "var(--color-chart-2)",
  totalInteractions: "var(--color-chart-3)",
};

type PlatformSeriesPoint = ClientMetricsPlatform["series"][number];
const KPI_SPARKLINE_FIELD: Record<string, keyof Omit<PlatformSeriesPoint, "date">> = {
  followers: "followers",
  reach: "reach",
  engagedAccounts: "engagedAccounts",
  totalInteractions: "totalInteractions",
};

const STAT_ICONS: Record<string, typeof Eye> = {
  Impressões: Layers,
  "Visualizações de perfil": Radar,
  Curtidas: Heart,
  Comentários: MessageCircle,
  Compartilhamentos: Share2,
  Salvamentos: Bookmark,
  "Cliques no link da bio": MousePointerClick,
};

function StatPill({ label, value, color, index }: { label: string; value: number | null; color: string; index: number }) {
  const Icon = STAT_ICONS[label] ?? Eye;
  return (
    <div
      className="animate-fade-slide-up flex-shrink-0 min-w-36 rounded-2xl bg-surface-2 px-4 py-3 flex flex-col gap-2"
      style={delayStyle(index)}
    >
      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={chipStyle(color)}>
        <Icon size={13} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2 truncate">{label}</p>
        <p className="text-base font-semibold text-ink tabular-nums">
          <CountUp value={value} />
        </p>
      </div>
    </div>
  );
}

function PlatformCard({ platform, cardIndex }: { platform: ClientMetricsPlatform; cardIndex: number }) {
  const color = SOCIAL_NETWORK_COLORS[platform.platform];
  const latest = platform.series[platform.series.length - 1];

  const heroKpi = platform.kpis.find((k) => k.key === "reach") ?? platform.kpis[0];
  const restKpis = platform.kpis.filter((k) => k.key !== heroKpi?.key);

  const detailTiles: { label: string; value: number | null }[] = [
    { label: "Impressões", value: latest?.impressions ?? null },
    { label: "Visualizações de perfil", value: latest?.profileViews ?? null },
  ];
  if (platform.platform === "INSTAGRAM") {
    detailTiles.push(
      { label: "Curtidas", value: latest?.likes ?? null },
      { label: "Comentários", value: latest?.comments ?? null },
      { label: "Compartilhamentos", value: latest?.shares ?? null },
      { label: "Salvamentos", value: latest?.saves ?? null },
      { label: "Cliques no link da bio", value: latest?.profileLinkTaps ?? null },
    );
  }

  function sparklineFor(key: string) {
    return platform.series.map((s) => {
      const field = KPI_SPARKLINE_FIELD[key];
      return field ? s[field] : null;
    });
  }

  return (
    <Card
      padding="none"
      className="overflow-hidden animate-fade-slide-up"
      style={delayStyle(cardIndex, 100)}
    >
      <div
        className="p-5 pb-4 flex items-center gap-3"
        style={{ background: `color-mix(in srgb, ${color} 6%, var(--color-surface))` }}
      >
        <span
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
          style={{ background: networkShapeBackground(platform.platform) ?? color }}
        >
          <SocialIcon network={platform.platform} size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{SOCIAL_NETWORK_LABELS[platform.platform]}</p>
          <p className="text-xs text-muted truncate">
            {platform.accountName}
            {platform.mediaCount != null && <span className="text-muted-2"> · {platform.mediaCount} posts</span>}
          </p>
        </div>
      </div>

      {platform.status === "pending" && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl bg-surface-2 px-4 py-3 flex items-center gap-2 text-xs text-muted">
            <Clock size={14} className="flex-shrink-0" /> Sincronizando as métricas, isso pode levar até 1 minuto.
          </div>
        </div>
      )}

      {platform.status === "needs_reconnect" && (
        <div className="px-5 pb-5">
          <div className="rounded-2xl bg-accent/10 px-4 py-3 flex items-start gap-2 text-xs text-accent font-medium">
            <RefreshCw size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Sem dados de desempenho ainda. Se essa conta nunca foi reconectada depois da atualização de métricas,
              reconecte em Integrações. Se já reconectou e continua assim, confira se quem conectou tem acesso de
              &ldquo;Analisar desempenho&rdquo; nessa Página/conta no Meta Business Suite - só permissão de
              publicação não é suficiente pros insights.
            </span>
          </div>
        </div>
      )}

      {platform.status === "ok" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1fr] gap-3 px-5 pt-4">
            {heroKpi && (
              <div
                className="animate-fade-slide-up relative overflow-hidden rounded-3xl p-5 flex flex-col justify-between min-h-40"
                style={{
                  ...delayStyle(0),
                  background: `linear-gradient(150deg, color-mix(in srgb, ${KPI_COLORS[heroKpi.key] ?? color} 18%, var(--color-surface)) 0%, var(--color-surface-2) 75%)`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={chipStyle(KPI_COLORS[heroKpi.key] ?? color)}
                  >
                    {(() => {
                      const HeroIcon = KPI_ICONS[heroKpi.key] ?? Eye;
                      return <HeroIcon size={17} strokeWidth={2} />;
                    })()}
                  </span>
                  <ChangeBadge changePct={heroKpi.changePct} />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
                    {heroKpi.label}
                  </span>
                  <p className="text-4xl font-light tracking-tight text-ink tabular-nums leading-tight">
                    <CountUp value={heroKpi.current} />
                  </p>
                </div>
                <div className="absolute bottom-0 left-0 right-0">
                  <Sparkline
                    data={sparklineFor(heroKpi.key)}
                    color={KPI_COLORS[heroKpi.key] ?? color}
                    heightClass="h-16"
                    fillOpacity={0.5}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {restKpis.map((kpi, i) => {
                const Icon = KPI_ICONS[kpi.key] ?? Eye;
                const kpiColor = KPI_COLORS[kpi.key] ?? color;
                return (
                  <div
                    key={kpi.key}
                    className="animate-fade-slide-up flex-1 flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-2.5"
                    style={delayStyle(i + 1)}
                  >
                    <span
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={chipStyle(kpiColor)}
                    >
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-2 truncate">
                        {kpi.label}
                      </p>
                      <p className="text-lg font-light tracking-tight text-ink tabular-nums leading-tight">
                        <CountUp value={kpi.current} />
                      </p>
                    </div>
                    <ChangeBadge changePct={kpi.changePct} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-5 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2 mb-1">
              Alcance, contas engajadas e visualizações de perfil (30 dias)
            </p>
            <MetricAreaChart
              data={platform.series.map((s) => ({
                date: s.date,
                reach: s.reach,
                engagedAccounts: s.engagedAccounts,
                profileViews: s.profileViews,
              }))}
              series={[
                { key: "reach", label: "Alcance" },
                { key: "engagedAccounts", label: "Contas engajadas" },
                { key: "profileViews", label: "Visualizações de perfil" },
              ]}
            />
          </div>

          <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pt-4 pb-1">
            {detailTiles.map((t, i) => (
              <StatPill key={t.label} label={t.label} value={t.value} color={color} index={i} />
            ))}
          </div>

          {platform.recentPosts.length > 0 && (
            <div className="mt-5">
              <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-2 flex items-center gap-1.5">
                <Newspaper size={11} /> Publicações recentes
              </p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-5">
                {platform.recentPosts.slice(0, 5).map((post, i) => (
                  <div
                    key={post.id}
                    className="animate-fade-slide-up flex-shrink-0 w-52 rounded-2xl bg-surface-2 p-4 flex flex-col gap-2.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10"
                    style={delayStyle(i)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <p className="text-[11px] text-muted-2">{formatDate(post.publishedAt)}</p>
                    </div>
                    <p className="text-xs font-semibold text-ink line-clamp-2 leading-snug">{post.title}</p>
                    <div className="flex flex-col gap-1 text-[11px] text-muted tabular-nums mt-auto pt-1 border-t border-border">
                      <span className="flex items-center justify-between">
                        <span className="text-muted-2">Alcance</span> {num(post.reach)}
                      </span>
                      <span className="flex items-center justify-between">
                        <span className="text-muted-2">Curtidas</span> {num(post.likes)}
                      </span>
                      <span className="flex items-center justify-between">
                        <span className="text-muted-2">Comentários</span> {num(post.comments)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function SocialMetricsView({ metrics }: { metrics: ClientMetrics }) {
  if (metrics.platforms.length === 0) {
    const otherNetworks = metrics.otherConnectedNetworks
      .map((n) => SOCIAL_NETWORK_LABELS[n as keyof typeof SOCIAL_NETWORK_LABELS] ?? n)
      .join(", ");
    return (
      <Card padding="none">
        <EmptyState
          icon={<BarChart3 size={20} strokeWidth={1.8} />}
          title={otherNetworks ? "Métricas ainda não disponíveis pra essas redes" : "Nenhuma rede conectada ainda"}
          description={
            otherNetworks
              ? `Esse cliente tem ${otherNetworks} conectado(s), mas a sincronização de métricas hoje só cobre Instagram e Facebook.`
              : "Conecte o Instagram ou o Facebook desse cliente em Integrações pra começar a acompanhar o desempenho aqui."
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {metrics.platforms.map((platform, i) => (
        <PlatformCard key={platform.platform} platform={platform} cardIndex={i} />
      ))}
    </div>
  );
}
