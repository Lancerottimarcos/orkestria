"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List, LayoutGrid, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ImageOff, Image as ImageIcon, GalleryThumbnails, ArrowUpRight, Plus, Check, Clock, FileText } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { FilterBar, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { ViewTabs } from "@/components/views/ViewTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { DottedDivider } from "@/components/ui/Dotted";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/format";
import {
  SOCIAL_NETWORKS,
  SOCIAL_NETWORK_COLORS,
  SOCIAL_NETWORK_LABELS,
  isMonoNetwork,
  networkShapeBackground,
} from "@/lib/socialNetworks";
import { SocialIcon } from "./SocialIcons";
import { SchedulePostModal } from "./SchedulePostModal";
import type { CardImageMode } from "./CardItem";
import { cn } from "@/lib/cn";
import type { AttachmentType, ScheduledCardData, SocialNetwork } from "./types";

type View = "list" | "calendar" | "board";

const CARD_IMAGE_MODE_KEY = "agendamentos-card-image-mode";
const CARD_IMAGE_MODES: CardImageMode[] = ["thumbnail", "cover", "hidden"];
const cardImageModeListeners = new Set<() => void>();

function subscribeCardImageMode(callback: () => void) {
  cardImageModeListeners.add(callback);
  return () => cardImageModeListeners.delete(callback);
}
function getCardImageModeSnapshot(): CardImageMode {
  const stored = localStorage.getItem(CARD_IMAGE_MODE_KEY);
  return (CARD_IMAGE_MODES as string[]).includes(stored ?? "") ? (stored as CardImageMode) : "thumbnail";
}
function getCardImageModeServerSnapshot(): CardImageMode {
  return "thumbnail";
}
function setCardImageMode(value: CardImageMode) {
  localStorage.setItem(CARD_IMAGE_MODE_KEY, value);
  cardImageModeListeners.forEach((callback) => callback());
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoje" / "Amanhã" / "quinta-feira, 21 de agosto" - pra agrupar a lista por dia. */
function dayLabel(iso: string) {
  const target = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(target, today)) return "Hoje";
  if (sameDay(target, tomorrow)) return "Amanhã";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(target);
}

function timeOnly(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function PublishStatusBadge({ status }: { status: "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED" | null }) {
  if (status === "PUBLISHED") return <Badge tone="success">Publicado</Badge>;
  if (status === "FAILED") return <Badge tone="danger">Falhou</Badge>;
  return null;
}

function NetworkBadge({ network, size = 20 }: { network: SocialNetwork; size?: number }) {
  const mono = isMonoNetwork(network);
  return (
    <span
      className={cn("rounded-full flex items-center justify-center flex-shrink-0", mono ? "bg-ink text-bg" : "text-white")}
      style={{ ...(mono ? {} : { background: networkShapeBackground(network) ?? undefined }), width: size, height: size }}
      title={SOCIAL_NETWORK_LABELS[network]}
    >
      <SocialIcon network={network} size={Math.round(size * 0.55)} />
    </span>
  );
}

/**
 * Capa da visão geral (quadro/calendário): proporção fixa 1080x1440
 * preenchida por completo (object-cover), sem nenhuma faixa de fundo visível
 * - aqui é uma prévia pra identificar o post de relance, não a revisão final
 * antes de agendar (essa, no modal de agendamento, segue o mesmo padrão).
 */
function CardCover({ url, type, alt }: { url: string | null; type?: AttachmentType; alt: string }) {
  if (!url) {
    return (
      <div className="rounded-2xl overflow-hidden bg-hatch aspect-[1080/1440] flex items-center justify-center text-muted-2">
        <ImageOff size={22} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-surface-3 aspect-[1080/1440]">
      {type === "VIDEO" ? (
        <video
          src={url}
          muted
          preload="metadata"
          className="w-full h-full object-cover object-bottom pointer-events-none"
          style={{ transform: "scale(1.3)", transformOrigin: "50% 100%" }}
        />
      ) : type === "FILE" ? (
        <div className="w-full h-full flex items-center justify-center text-muted-2">
          <FileText size={28} strokeWidth={1.6} />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover object-bottom"
          style={{ transform: "scale(1.3)", transformOrigin: "50% 100%" }}
        />
      )}
    </div>
  );
}

function ScheduledThumb({ card, size = 36 }: { card: ScheduledCardData; size?: number }) {
  const cover = card.attachments[0];
  if (cover) {
    if (cover.type === "FILE") {
      return (
        <div
          style={{ width: size, height: size }}
          className="rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 text-muted-2"
        >
          <FileText size={size * 0.5} strokeWidth={1.6} />
        </div>
      );
    }
    return cover.type === "VIDEO" ? (
      <video
        src={cover.url}
        muted
        preload="metadata"
        style={{ width: size, height: size }}
        className="rounded-xl object-cover flex-shrink-0 bg-surface-3 pointer-events-none"
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover.url}
        alt={card.title}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover flex-shrink-0 bg-surface-3"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-surface-2 flex items-center justify-center flex-shrink-0 text-muted-2"
    >
      <ImageOff size={size * 0.4} />
    </div>
  );
}

/** Miniatura do calendário: ao passar o mouse, mostra a arte em tamanho maior com título e legenda. */
function CalendarDayThumb({ card, onOpen }: { card: ScheduledCardData; onOpen: (card: ScheduledCardData) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(card)}
      title={`${card.title} · ${SOCIAL_NETWORK_LABELS[card.scheduledNetwork]} · ${formatDateTime(card.scheduledAt)}`}
      className="group/thumb relative flex items-center gap-1 rounded-lg bg-surface px-1 py-1 hover:bg-surface-3 transition-colors w-full text-left cursor-pointer"
    >
      <ScheduledThumb card={card} size={16} />
      <span className="text-[10px] font-medium text-ink truncate flex-1">{card.title}</span>
      {card.publishStatus === "PUBLISHED" && (
        <span
          className="w-3.5 h-3.5 rounded-full bg-success/15 text-success flex items-center justify-center flex-shrink-0"
          title="Publicado"
        >
          <Check size={9} strokeWidth={3} />
        </span>
      )}
      {card.publishStatus === "FAILED" && (
        <span
          className="w-3.5 h-3.5 rounded-full bg-danger/15 text-danger flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
          title="Falhou ao publicar"
        >
          !
        </span>
      )}
      <NetworkBadge network={card.scheduledNetwork} size={14} />

      <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-2 w-52 -translate-x-1/2 opacity-0 scale-95 group-hover/thumb:opacity-100 group-hover/thumb:scale-100 transition-all duration-150 origin-bottom">
        <div className="bg-surface rounded-2xl shadow-2xl shadow-black/25 border border-border overflow-hidden">
          <div className="p-1.5 pb-0">
            <CardCover url={card.coverUrl} type={card.attachments[0]?.type} alt={card.title} />
          </div>
          <div className="p-3 flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-1.5">
              <NetworkBadge network={card.scheduledNetwork} size={16} />
              <span className="text-[11px] font-semibold text-muted">{formatDateTime(card.scheduledAt)}</span>
              <span className="ml-auto"><PublishStatusBadge status={card.publishStatus} /></span>
            </div>
            <p className="text-xs font-semibold text-ink leading-snug line-clamp-2">{card.title}</p>
            {card.description && (
              <p className="text-[11px] text-muted leading-snug line-clamp-2">{card.description}</p>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function ScheduledContentView({
  initialCards,
}: {
  initialCards: ScheduledCardData[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const imageMode = useSyncExternalStore(
    subscribeCardImageMode,
    getCardImageModeSnapshot,
    getCardImageModeServerSnapshot,
  );
  const [networkFilter, setNetworkFilter] = useState<SocialNetwork | "">("");
  const [clientFilter, setClientFilter] = useState("");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [scheduleModalCard, setScheduleModalCard] = useState<ScheduledCardData | null>(null);
  const { alertDialog } = useConfirmDialog();

  async function handleReschedule(network: SocialNetwork, date: string, time: string) {
    if (!scheduleModalCard) return;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, scheduledAt }),
    });
    if (res.ok) {
      const updated = await res.json();
      // 207 (parcialmente publicado) também cai em res.ok - checa o
      // publishStatus de verdade antes de tratar como sucesso silencioso.
      if (updated.publishStatus === "FAILED") {
        await alertDialog(updated.publishError ?? "O agendamento foi salvo, mas a publicação na rede falhou.");
      }
    } else {
      await alertDialog("Não foi possível agendar - tente novamente.");
    }
    setScheduleModalCard(null);
    router.refresh();
  }

  async function handleCancelSchedule() {
    if (!scheduleModalCard) return;
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: null, scheduledAt: null }),
    });
    if (res.status === 207) {
      await alertDialog(
        "Cancelado aqui, mas não foi possível remover a publicação agendada do lado da rede social (token pode ter expirado) - ela pode acabar publicando sozinha no horário original. Confira manualmente na plataforma.",
      );
    }
    setScheduleModalCard(null);
    router.refresh();
  }

  async function handlePublishNow() {
    if (!scheduleModalCard) return;
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/publish-now`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (!res.ok) await alertDialog(data?.error ?? "Falha ao publicar agora");
    setScheduleModalCard(null);
    router.refresh();
  }

  const clients = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl: string | null }>();
    for (const c of initialCards) if (c.client) map.set(c.client.id, { name: c.client.name, avatarUrl: c.client.avatarUrl });
    return [...map.entries()]
      .map(([id, { name, avatarUrl }]) => ({ id, name, avatarUrl }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialCards]);

  const filtered = useMemo(
    () =>
      initialCards.filter((c) => {
        if (networkFilter && c.scheduledNetwork !== networkFilter) return false;
        if (clientFilter && c.client?.id !== clientFilter) return false;
        return true;
      }),
    [initialCards, networkFilter, clientFilter],
  );

  const filterActive = Boolean(networkFilter || clientFilter);

  // Já vem ordenado por scheduledAt (a query do servidor ordena asc), então
  // só precisa juntar itens consecutivos do mesmo dia.
  const groupedByDay = useMemo(() => {
    const groups: { label: string; cards: ScheduledCardData[] }[] = [];
    for (const card of filtered) {
      const label = dayLabel(card.scheduledAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.cards.push(card);
      else groups.push({ label, cards: [card] });
    }
    return groups;
  }, [filtered]);

  // ---------- Calendário ----------
  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const days: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }

  function cardsOnDay(day: Date) {
    return filtered.filter((c) => sameDay(new Date(c.scheduledAt), day));
  }

  return (
    <div>
      <PageHeader
        title="Conteúdo Agendado"
        description="Publicações agendadas nas demandas, por rede social"
        actions={
          <>
            <Link
              href="/kanban"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-accent transition-colors"
            >
              Ver quadro de demandas <ArrowUpRight size={14} />
            </Link>
            <Link
              href="/agendamentos/novo"
              className="inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all duration-150 active:scale-[0.98] cursor-pointer bg-accent text-black hover:bg-accent-light px-3.5 py-2 text-xs"
            >
              <Plus size={14} /> Novo agendamento
            </Link>
          </>
        }
      />

      <FilterBar>
        <FilterSelect value={networkFilter} onChange={(e) => setNetworkFilter(e.target.value as SocialNetwork | "")} className="max-w-40">
          <option value="">Toda rede</option>
          {SOCIAL_NETWORKS.map((n) => (
            <option key={n.key} value={n.key}>{n.label}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="max-w-44">
          <option value="">Todo cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
          ))}
        </FilterSelect>
        {filterActive && (
          <FilterClearButton
            onClick={() => {
              setNetworkFilter("");
              setClientFilter("");
            }}
          />
        )}
        <div className="flex items-center gap-0.5 bg-surface shadow-sm shadow-black/5 rounded-full p-1 flex-shrink-0">
          {(
            [
              { mode: "thumbnail" as const, icon: GalleryThumbnails, title: "Imagem miniatura nos cards" },
              { mode: "cover" as const, icon: ImageIcon, title: "Com imagem nos cards" },
              { mode: "hidden" as const, icon: ImageOff, title: "Sem imagem nos cards" },
            ]
          ).map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCardImageMode(mode)}
              title={title}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                imageMode === mode ? "bg-accent text-black" : "text-muted hover:text-accent",
              )}
            >
              <Icon size={15} strokeWidth={1.8} />
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <ViewTabs
            value={view}
            onChange={setView}
            options={[
              { key: "list", label: "Lista", icon: List },
              { key: "calendar", label: "Calendário", icon: CalendarIcon },
              { key: "board", label: "Quadro", icon: LayoutGrid },
            ]}
          />
        </div>
      </FilterBar>

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<CalendarIcon size={22} strokeWidth={1.8} />}
            title={initialCards.length === 0 ? "Nenhuma publicação agendada" : "Nenhuma publicação encontrada com esses filtros"}
            description={
              initialCards.length === 0
                ? 'Arraste uma demanda para a coluna "Agendado" no quadro de Demandas para escolher a rede social, data e horário de publicação.'
                : "Ajuste os filtros acima para encontrar a publicação."
            }
          />
        </Card>
      ) : view === "list" ? (
        <div className="flex flex-col gap-6">
          {groupedByDay.map((group) => (
            <div key={group.label}>
              <p className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-2">{group.label}</p>
              <Card padding="sm">
                {group.cards.map((card, i) => (
                  <div key={card.id}>
                    {i > 0 && <DottedDivider />}
                    <button
                      type="button"
                      onClick={() => setScheduleModalCard(card)}
                      className="flex items-center gap-3 px-3 py-3.5 hover:bg-surface-2/50 rounded-2xl transition-colors w-full text-left cursor-pointer"
                    >
                      <span
                        className={cn(
                          "hidden sm:flex flex-col items-center justify-center w-11 h-11 rounded-2xl flex-shrink-0 text-[11px] font-bold",
                          isMonoNetwork(card.scheduledNetwork) && "text-ink bg-surface-3",
                        )}
                        style={
                          isMonoNetwork(card.scheduledNetwork)
                            ? undefined
                            : {
                                color: SOCIAL_NETWORK_COLORS[card.scheduledNetwork],
                                background: `color-mix(in srgb, ${SOCIAL_NETWORK_COLORS[card.scheduledNetwork]} 12%, transparent)`,
                              }
                        }
                      >
                        {timeOnly(card.scheduledAt)}
                      </span>
                      <ScheduledThumb card={card} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">{card.title}</p>
                        <p className="text-[11px] text-muted truncate">
                          {card.client?.name ?? card.description ?? "Sem legenda"}
                        </p>
                      </div>
                      {card.assignee && (
                        <span className="hidden sm:inline-flex flex-shrink-0" title={card.assignee.name}>
                          <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={24} />
                        </span>
                      )}
                      <PublishStatusBadge status={card.publishStatus} />
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full flex-shrink-0",
                          isMonoNetwork(card.scheduledNetwork) ? "bg-ink text-bg" : "text-white",
                        )}
                        style={
                          isMonoNetwork(card.scheduledNetwork)
                            ? undefined
                            : { background: networkShapeBackground(card.scheduledNetwork) ?? undefined }
                        }
                      >
                        <SocialIcon network={card.scheduledNetwork} size={11} />
                        <span className="sm:hidden">{timeOnly(card.scheduledAt)}</span>
                        {SOCIAL_NETWORK_LABELS[card.scheduledNetwork]}
                      </span>
                    </button>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      ) : view === "calendar" ? (
        <Card padding="sm" className="overflow-visible">
          <div className="flex items-center justify-between px-2 pb-3">
            <p className="text-sm font-semibold text-ink">
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 px-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold text-muted-2 pb-1.5">
                {w}
              </div>
            ))}
            {days.map((day) => {
              const dayCards = cardsOnDay(day);
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative rounded-2xl p-1.5 min-h-24 flex flex-col gap-1 border border-transparent overflow-visible",
                    inMonth ? "bg-surface-2/60" : "bg-hatch opacity-50",
                    isToday && "border-accent",
                  )}
                >
                  <span className={cn("text-[11px] font-semibold px-0.5", inMonth ? "text-muted" : "text-muted-2")}>
                    {day.getDate()}
                  </span>
                  <div className="flex flex-col gap-1 overflow-visible">
                    {dayCards.slice(0, 3).map((c) => (
                      <CalendarDayThumb key={c.id} card={c} onOpen={setScheduleModalCard} />
                    ))}
                    {dayCards.length > 3 && (
                      <span className="text-[10px] font-semibold text-muted-2 px-1">+{dayCards.length - 3} mais</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {SOCIAL_NETWORKS.map((network) => {
            const networkCards = filtered
              .filter((c) => c.scheduledNetwork === network.key)
              .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
            const color = SOCIAL_NETWORK_COLORS[network.key];
            const mono = isMonoNetwork(network.key);
            return (
              <div key={network.key} className="w-80 flex-shrink-0 flex flex-col bg-surface-2/50 rounded-3xl p-3">
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-full mb-3",
                    mono ? "bg-ink text-bg" : "text-white",
                  )}
                  style={mono ? undefined : { background: networkShapeBackground(network.key) ?? undefined }}
                >
                  <span
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                      mono ? "bg-bg/20 text-bg" : "bg-white/25 text-white",
                    )}
                  >
                    <SocialIcon network={network.key} size={15} />
                  </span>
                  <span className={cn("text-[15px] font-bold flex-1", mono ? "text-bg" : "text-white")}>{network.label}</span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 tabular-nums",
                      mono ? "bg-bg/20 text-bg" : "bg-white/25 text-white",
                    )}
                  >
                    {networkCards.length}
                  </span>
                </div>
                <Link
                  href={`/agendamentos/novo?network=${network.key}`}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-2xl bg-surface text-ink hover:bg-surface-3 transition-colors mb-3 cursor-pointer"
                >
                  <Plus size={13} /> Agendar no {network.label}
                </Link>
                <div className="flex flex-col gap-3 px-0.5">
                  {networkCards.length === 0 ? (
                    <div className="rounded-3xl bg-hatch border border-dotted border-border-2 py-8">
                      <p className="text-xs text-muted-2 text-center">Nada agendado</p>
                    </div>
                  ) : (
                    networkCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setScheduleModalCard(card)}
                        className="bg-surface rounded-3xl shadow-sm shadow-black/5 border-[1.5px] flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all text-left cursor-pointer w-full"
                        style={{ borderColor: mono ? "var(--color-border-2)" : `color-mix(in srgb, ${color} 45%, transparent)` }}
                      >
                        <div className="p-3 flex flex-col gap-3">
                          {imageMode === "cover" && <CardCover url={card.coverUrl} type={card.attachments[0]?.type} alt={card.title} />}
                          <div className="flex items-center gap-3">
                            {imageMode === "thumbnail" && card.coverUrl && (
                              card.attachments[0]?.type === "VIDEO" ? (
                                <video
                                  src={card.coverUrl}
                                  muted
                                  preload="metadata"
                                  className="flex-shrink-0 w-16 h-16 rounded-2xl object-cover bg-surface-3 pointer-events-none"
                                />
                              ) : card.attachments[0]?.type === "FILE" ? (
                                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center text-muted-2">
                                  <FileText size={26} strokeWidth={1.6} />
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={card.coverUrl}
                                  alt={card.title}
                                  className="flex-shrink-0 w-16 h-16 rounded-2xl object-cover bg-surface-3"
                                />
                              )
                            )}
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <p className="text-sm font-semibold text-ink leading-snug flex-1">{card.title}</p>
                              <PublishStatusBadge status={card.publishStatus} />
                            </div>
                          </div>
                          {card.description && (
                            <p className="text-xs text-muted leading-snug line-clamp-2 -mt-1">{card.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            {card.client && (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-ink max-w-40"
                                title={card.client.name}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                                <span className="truncate">{card.client.name}</span>
                              </span>
                            )}
                            {card.assignee && (
                              <span title={card.assignee.name}>
                                <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={20} />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 pt-2.5 border-t border-dotted border-border-2 text-muted">
                            <Clock size={12} className="flex-shrink-0" />
                            <span className="text-[11px] font-semibold">
                              {dayLabel(card.scheduledAt)} · {timeOnly(card.scheduledAt)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SchedulePostModal
        open={Boolean(scheduleModalCard)}
        card={scheduleModalCard}
        onClose={() => setScheduleModalCard(null)}
        onSubmit={handleReschedule}
        onCancelSchedule={handleCancelSchedule}
        onPublishNow={handlePublishNow}
      />
    </div>
  );
}
