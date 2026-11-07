"use client";

import { useState, useEffect, useRef } from "react";
import {
  CalendarClock,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Plus,
  Music2,
  Globe2,
  Disc3,
  Zap,
  CalendarX2,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { SOCIAL_NETWORKS, SOCIAL_NETWORK_LABELS, isMonoNetwork, networkShapeBackground } from "@/lib/socialNetworks";
import { SocialIcon } from "./SocialIcons";
import type { AttachmentData, PublishStatus, SocialNetwork } from "./types";

export type PostPreviewCard = {
  id: string;
  title: string;
  description?: string | null;
  client?: { name: string; avatarUrl?: string | null } | null;
  attachments: AttachmentData[];
};

/** Formato mínimo aceito pelo modal - tanto o card completo do Kanban quanto o item resumido da lista de Agendamentos servem. */
export type ScheduleModalCard = {
  id: string;
  title: string;
  description?: string | null;
  scheduledNetwork?: SocialNetwork | null;
  scheduledAt?: string | null;
  publishStatus?: PublishStatus | null;
  client?: { id?: string; name: string; avatarUrl?: string | null } | null;
  attachments: AttachmentData[];
};

function todayISODate() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

/** Proporção padrão de cada rede enquanto a arte real ainda não carregou pra revelar seu formato de verdade. */
const NETWORK_DEFAULT_RATIO: Record<SocialNetwork, number> = {
  INSTAGRAM: 4 / 5,
  FACEBOOK: 4 / 5,
  TIKTOK: 9 / 16,
  YOUTUBE: 16 / 9,
  LINKEDIN: 4 / 5,
  THREADS: 4 / 5,
};

// Limites de proporção das redes (do vertical 9:16 ao paisagem 1.91:1) - evita
// que um arquivo com dimensão estranha estique a prévia até ficar ilegível.
function clampRatio(ratio: number) {
  return Math.min(1.91, Math.max(9 / 16, ratio));
}

/** Avatar da prévia: usa o logo real do cliente quando existe, senão cai pra inicial do nome. */
function ClientAvatar({ name, avatarUrl, className, ring }: { name: string; avatarUrl?: string | null; className: string; ring?: boolean }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn(className, "object-cover", ring && "ring-2 ring-white")}
      />
    );
  }
  return (
    <span className={cn(className, "flex items-center justify-center font-bold", ring && "ring-2 ring-white")}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function NetworkAvatarBadge({ network }: { network: SocialNetwork }) {
  const mono = isMonoNetwork(network);
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-surface",
        mono ? "bg-ink text-bg" : "text-white",
      )}
      style={mono ? undefined : { background: networkShapeBackground(network) ?? undefined }}
    >
      <SocialIcon network={network} size={9} />
    </span>
  );
}

/**
 * Prévia da publicação já "dentro" da rede escolhida: cabeçalho com o selo da
 * rede, e a moldura de ações abaixo da arte no estilo nativo de cada uma
 * (curtir/comentar/enviar do Instagram, curtir/comentar/compartilhar em
 * texto do Facebook, ou a barra lateral + legenda sobreposta do TikTok).
 * Instagram/Facebook nunca recortam a arte - ela encolhe pra caber inteira
 * dentro de uma altura máxima, com uma faixa de fundo à volta quando a
 * proporção não bate com a moldura (vale pra qualquer formato, retrato,
 * quadrado ou paisagem tipo 1920x1080). O TikTok continua preenchendo a
 * moldura toda (com o vídeo cortado se preciso), igual ao app real, que é
 * genuinamente imersivo em vez de mostrar a arte dentro de um card. Com mais
 * de um anexo, vira um carrossel arrastável (touch e mouse) com setas e
 * indicadores.
 */
export function PostPreview({ card, network }: { card: PostPreviewCard; network?: SocialNetwork | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ active: boolean; startX: number; startScrollLeft: number }>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
  });
  const [slide, setSlide] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const attachments = card.attachments;
  const isCarousel = attachments.length > 1;
  const activeAttachment = attachments[slide];
  const fallbackRatio = network ? NETWORK_DEFAULT_RATIO[network] : NETWORK_DEFAULT_RATIO.INSTAGRAM;
  const ratio = clampRatio((activeAttachment && ratios[activeAttachment.id]) || fallbackRatio);
  const isTikTok = network === "TIKTOK";

  useEffect(() => {
    setSlide(0);
    setRatios({});
    scrollRef.current?.scrollTo({ left: 0 });
  }, [card.id]);

  function reportRatio(id: string, width: number, height: number) {
    if (!width || !height) return;
    setRatios((prev) => (prev[id] ? prev : { ...prev, [id]: width / height }));
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i: number) {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(attachments.length - 1, i));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }

  // Arrastar com o mouse para revisar o carrossel (touch já arrasta nativo).
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isCarousel) return;
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScrollLeft: el.scrollLeft };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.startScrollLeft - (e.clientX - drag.current.startX);
  }

  function handlePointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    setDragging(false);
    goTo(slide);
    handleScroll();
  }

  const displayName = card.client?.name ?? "Prévia da publicação";

  // TikTok é imersivo de verdade (o vídeo preenche a tela toda no app real),
  // então continua ocupando a moldura inteira. Instagram/Facebook mostram a
  // arte dentro de um card com borda visível - aí cortar conteúdo é sempre
  // ruim (perde parte da imagem/legenda embutida), então a prévia nunca
  // recorta: encolhe a arte pra caber inteira, com uma faixa de fundo à
  // volta quando a proporção não bate exatamente com a moldura.
  const MEDIA_MAX_HEIGHT = 480;
  const mediaFit = isTikTok ? "cover" : "contain";

  const media = (
    <div className="relative bg-hatch">
      {attachments.length > 0 ? (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={isTikTok || isCarousel ? { aspectRatio: isTikTok ? ratio : undefined, height: isTikTok ? undefined : MEDIA_MAX_HEIGHT } : undefined}
          className={cn(
            "flex overflow-x-auto snap-x snap-mandatory no-scrollbar select-none",
            !isTikTok && !isCarousel && "items-center justify-center",
            dragging ? "cursor-grabbing" : isCarousel ? "cursor-grab scroll-smooth" : "scroll-smooth",
          )}
        >
          {attachments.map((a) => (
            <div
              key={a.id}
              className={cn(
                "flex-shrink-0 snap-center overflow-hidden bg-surface-3",
                isTikTok || isCarousel ? "w-full h-full flex items-center justify-center" : "w-full",
              )}
            >
              {a.type === "VIDEO" ? (
                <video
                  src={a.url}
                  controls
                  className={mediaFit === "cover" ? "w-full h-full object-cover" : "max-w-full object-contain"}
                  style={mediaFit === "contain" ? { maxHeight: MEDIA_MAX_HEIGHT } : undefined}
                  onLoadedMetadata={(e) => reportRatio(a.id, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.name ?? card.title}
                  draggable={false}
                  className={cn(
                    "pointer-events-none",
                    mediaFit === "cover" ? "w-full h-full object-cover" : "max-w-full object-contain",
                  )}
                  style={mediaFit === "contain" ? { maxHeight: MEDIA_MAX_HEIGHT } : undefined}
                  onLoad={(e) => reportRatio(a.id, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-square flex flex-col items-center justify-center gap-2 text-muted-2">
          <ImageOff size={28} />
          <span className="text-xs font-medium">Sem arte anexada na demanda</span>
        </div>
      )}

      {isCarousel && (
        <>
          <span className="absolute top-2.5 right-2.5 z-10 text-[11px] font-semibold text-white bg-black/50 px-2 py-0.5 rounded-full">
            {slide + 1}/{attachments.length}
          </span>
          {slide > 0 && (
            <button
              type="button"
              onClick={() => goTo(slide - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {slide < attachments.length - 1 && (
            <button
              type="button"
              onClick={() => goTo(slide + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          )}
          {!isTikTok && (
            <div className="absolute bottom-2.5 inset-x-0 z-10 flex items-center justify-center gap-1.5">
              {attachments.map((a, i) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    i === slide ? "w-4 bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );

  // TikTok: vídeo cheio sem cabeçalho no topo (o app real não tem um -
  // usuário, legenda e música ficam sobrepostos embaixo à esquerda, e as
  // ações na barra vertical à direita, igual à tela do app hoje).
  if (isTikTok) {
    return (
      <div className="rounded-2xl overflow-hidden border border-border bg-black relative">
        {media}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/5 to-transparent">
          <div className="flex items-end gap-3 px-3.5 pb-3.5 pt-10">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate drop-shadow">
                @{displayName.toLowerCase().replace(/\s+/g, "")}
              </p>
              {card.description ? (
                <p className="text-xs text-white/90 mt-1 line-clamp-2 whitespace-pre-wrap drop-shadow">{card.description}</p>
              ) : (
                <p className="text-xs text-white/70 mt-1">{card.title}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 text-white/85">
                <Music2 size={12} className="flex-shrink-0" />
                <span className="text-[11px] font-medium truncate drop-shadow">som original · {displayName}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 text-white flex-shrink-0 pb-1">
              <span className="relative flex-shrink-0">
                <ClientAvatar
                  name={displayName}
                  avatarUrl={card.client?.avatarUrl}
                  ring
                  className="w-9 h-9 rounded-full bg-white/20 text-xs"
                />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-danger flex items-center justify-center ring-2 ring-black">
                  <Plus size={10} strokeWidth={3} />
                </span>
              </span>
              <Heart size={26} className="drop-shadow" />
              <MessageCircle size={24} className="drop-shadow" />
              <Bookmark size={23} className="drop-shadow" />
              <Share2 size={23} className="drop-shadow" />
              <span className="w-8 h-8 rounded-full bg-surface-3 ring-1 ring-white/40 flex items-center justify-center">
                <Disc3 size={16} className="text-ink" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Instagram/Facebook: cabeçalho normal + arte + barra de ações abaixo.
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-surface">
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <div className="relative flex-shrink-0">
          <ClientAvatar
            name={displayName}
            avatarUrl={card.client?.avatarUrl}
            className="w-8 h-8 rounded-full bg-accent/15 text-xs text-accent"
          />
          {network && <NetworkAvatarBadge network={network} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink truncate">{displayName}</p>
          {network === "FACEBOOK" && (
            <p className="text-[11px] text-muted-2 flex items-center gap-1">
              Agora · <Globe2 size={10} />
            </p>
          )}
          {network === "YOUTUBE" && <p className="text-[11px] text-muted-2">Canal</p>}
          {network === "LINKEDIN" && <p className="text-[11px] text-muted-2">Company Page</p>}
        </div>
        <MoreHorizontal size={18} className="text-muted flex-shrink-0" />
      </div>

      {media}

      {network === "FACEBOOK" || network === "YOUTUBE" || network === "LINKEDIN" ? (
        <div className="px-3.5 pt-3">
          <p className="text-sm text-ink">
            <span className="font-semibold">{card.title}</span>
          </p>
          {card.description ? (
            <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{card.description}</p>
          ) : (
            <p className="text-xs text-muted-2 mt-1">Sem legenda cadastrada na demanda.</p>
          )}
          <div className="flex items-center mt-3 border-t border-border">
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted">
              <ThumbsUp size={15} /> {network === "YOUTUBE" ? "Gostei" : "Curtir"}
            </span>
            {network !== "YOUTUBE" && (
              <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted">
                <MessageCircle size={15} /> Comentar
              </span>
            )}
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted">
              <Share2 size={15} /> Compartilhar
            </span>
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-3">
          <div className="flex items-center gap-3.5 text-ink mb-2">
            <Heart size={20} strokeWidth={1.8} />
            <MessageCircle size={20} strokeWidth={1.8} />
            <Send size={19} strokeWidth={1.8} />
            <span className="flex-1" />
            <Bookmark size={19} strokeWidth={1.8} />
          </div>
          <p className="text-sm text-ink">
            <span className="font-semibold">{card.title}</span>
          </p>
          {card.description ? (
            <p className="text-sm text-muted mt-1 whitespace-pre-wrap">{card.description}</p>
          ) : (
            <p className="text-xs text-muted-2 mt-1">Sem legenda cadastrada na demanda.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SchedulePostModal({
  open,
  card,
  onClose,
  onSubmit,
  onCancelSchedule,
  onPublishNow,
}: {
  open: boolean;
  card: ScheduleModalCard | null;
  onClose: () => void;
  onSubmit: (network: SocialNetwork, date: string, time: string) => Promise<void> | void;
  onCancelSchedule?: () => Promise<void> | void;
  onPublishNow?: () => Promise<void> | void;
}) {
  const [network, setNetwork] = useState<SocialNetwork | null>(null);
  const { confirmDialog } = useConfirmDialog();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [publishingNow, setPublishingNow] = useState(false);
  const [connectedNetworks, setConnectedNetworks] = useState<SocialNetwork[] | null>(null);

  useEffect(() => {
    if (!open) return;
    if (card?.scheduledNetwork) setNetwork(card.scheduledNetwork);
    else setNetwork(null);
    if (card?.scheduledAt) {
      const d = new Date(card.scheduledAt);
      setDate(d.toISOString().slice(0, 10));
      setTime(d.toTimeString().slice(0, 5));
    } else {
      setDate(todayISODate());
      setTime("09:00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, card?.id]);

  const clientId = card?.client?.id;
  useEffect(() => {
    if (!open || !clientId) {
      setConnectedNetworks(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/integrations/meta/accounts?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data: { platform: SocialNetwork; status: string }[]) => {
        if (cancelled) return;
        setConnectedNetworks(
          Array.isArray(data) ? data.filter((a) => a.status === "ACTIVE").map((a) => a.platform) : [],
        );
      })
      .catch(() => {
        if (!cancelled) setConnectedNetworks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, clientId]);

  async function handleSubmit() {
    if (!network || !date || !time) return;
    setSubmitting(true);
    try {
      await onSubmit(network, date, time);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSchedule() {
    if (!onCancelSchedule) return;
    if (!(await confirmDialog("Cancelar este agendamento? A publicação não vai mais sair no horário marcado.", { tone: "danger", confirmLabel: "Cancelar agendamento", cancelLabel: "Voltar" }))) return;
    setCanceling(true);
    try {
      await onCancelSchedule();
    } finally {
      setCanceling(false);
    }
  }

  async function handlePublishNow() {
    if (!onPublishNow) return;
    if (!(await confirmDialog("Publicar agora mesmo, sem esperar o horário agendado? Essa ação não pode ser desfeita.", { tone: "default", confirmLabel: "Publicar agora" }))) return;
    setPublishingNow(true);
    try {
      await onPublishNow();
    } finally {
      setPublishingNow(false);
    }
  }

  const showDisconnectedWarning = Boolean(
    network && connectedNetworks !== null && !connectedNetworks.includes(network),
  );
  const canSubmit = Boolean(network && date && time);
  const isEditingExisting = Boolean(card?.scheduledNetwork && card?.scheduledAt);
  const isPublished = card?.publishStatus === "PUBLISHED";
  const busy = submitting || canceling || publishingNow;

  return (
    <Modal open={open} onClose={onClose} title="Agendar" titleAccent="publicação" width="lg">
      <div className="flex flex-col gap-4">
        {card && <PostPreview card={card} network={network} />}

        <Field label="Rede social">
          <div className="flex gap-2">
            {SOCIAL_NETWORKS.map((n) => {
              const mono = isMonoNetwork(n.key);
              const selected = network === n.key;
              return (
                <button
                  key={n.key}
                  type="button"
                  onClick={() => setNetwork(n.key)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-colors cursor-pointer",
                    selected
                      ? cn("border-transparent", mono ? "bg-ink text-bg" : "text-white")
                      : "border-border-2 text-muted hover:border-accent hover:text-ink",
                  )}
                  style={selected && !mono ? { background: networkShapeBackground(n.key) ?? undefined } : undefined}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      selected ? (mono ? "bg-bg/20 text-bg" : "bg-white/20 text-white") : "bg-surface-2 text-ink",
                    )}
                  >
                    <SocialIcon network={n.key} size={16} />
                  </span>
                  <span className="text-xs font-semibold">{n.label}</span>
                </button>
              );
            })}
          </div>
        </Field>

        {showDisconnectedWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs text-danger">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>
              Esse cliente não tem {SOCIAL_NETWORK_LABELS[network!]} conectado. O agendamento fica salvo como lembrete,
              mas ninguém vai publicar sozinho no horário marcado.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Horário">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <Button onClick={handleSubmit} disabled={!canSubmit || busy} className="mt-1">
          <CalendarClock size={15} />
          {submitting
            ? "Salvando..."
            : isEditingExisting
              ? "Salvar alterações"
              : network
                ? `Agendar no ${SOCIAL_NETWORK_LABELS[network]}`
                : "Confirmar agendamento"}
        </Button>

        {isEditingExisting && !isPublished && (
          <div className="flex gap-3">
            {onPublishNow && (
              <Button variant="dark" onClick={handlePublishNow} disabled={busy} className="flex-1">
                <Zap size={15} /> {publishingNow ? "Publicando..." : "Publicar agora"}
              </Button>
            )}
            {onCancelSchedule && (
              <Button variant="danger" onClick={handleCancelSchedule} disabled={busy} className="flex-1">
                <CalendarX2 size={15} /> {canceling ? "Cancelando..." : "Cancelar agendamento"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
