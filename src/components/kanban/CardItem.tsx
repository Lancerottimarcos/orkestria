"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Briefcase,
  Trash2,
  Clock,
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  Paperclip,
  Zap,
  MessageCircle,
  ListChecks,
  Check,
  CalendarClock,
  X,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format";
import { PRIORITY_LABELS, PRIORITY_COLORS, POST_STATUS_LABELS, POST_STATUS_COLORS } from "@/lib/labels";
import { isMonoNetwork, networkShapeBackground } from "@/lib/socialNetworks";
import { SocialIcon } from "./SocialIcons";
import { Avatar } from "@/components/ui/Avatar";
import { Lightbox } from "@/components/ui/Lightbox";
import { PowerUpsManager } from "./PowerUpsManager";
import type { KanbanCardData, Option, UserOption, DemandTypeOption } from "./types";

export type CardImageMode = "cover" | "thumbnail" | "hidden";

const POST_BADGE: Record<string, { icon: typeof Clock }> = {
  PENDING: { icon: Clock },
  APPROVED: { icon: CheckCircle2 },
  CHANGES_REQUESTED: { icon: MessageSquareWarning },
  REJECTED: { icon: XCircle },
};

function ColorChip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {children}
    </span>
  );
}

export function CardItem({
  card,
  onClick,
  onSchedule,
  onUnmarkComplete,
  onDelete,
  dimmed = false,
  imageMode = "thumbnail",
  allColumns,
  users,
  demandTypes,
  currentUserId,
}: {
  card: KanbanCardData;
  onClick: () => void;
  onSchedule?: () => void;
  onUnmarkComplete?: () => void;
  onDelete: () => void;
  dimmed?: boolean;
  imageMode?: CardImageMode;
  allColumns: Option[];
  users: UserOption[];
  demandTypes: DemandTypeOption[];
  currentUserId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const [powerUpsOpen, setPowerUpsOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const statusColor = card.post ? POST_STATUS_COLORS[card.post.status] : null;
  const cover = imageMode !== "hidden" ? card.attachments[0] : undefined;
  // Só o "Marcar como concluído" (completedAt) acende o verde do card - ele
  // sempre pode ser desmarcado. Post aprovado pelo cliente é um estado à
  // parte, sinalizado só pelo chip de status abaixo, para não deixar o card
  // preso em verde sem nenhum controle para tirar.
  const isConcluded = Boolean(card.completedAt);

  // Whole card gets a subtle background wash only for the outcome that needs
  // urgent attention - client feedback (danger). A finished/approved card
  // (success) is signaled with a solid ring + filled check icon instead of a
  // tinted background: a translucent green wash muddies every chip drawn on
  // top of it (chips are themselves translucent), making text and tags hard
  // to read. Priority stays a plain chip below either way.
  const statusAccent: "success" | "danger" | null =
    card.post?.status === "CHANGES_REQUESTED" || card.post?.status === "REJECTED"
      ? "danger"
      : isConcluded
        ? "success"
        : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(statusAccent === "danger" && {
      backgroundColor: `color-mix(in srgb, var(--color-danger) 10%, var(--color-surface))`,
    }),
  };

  const checklistTotals = card.checklists.reduce(
    (acc, c) => ({ done: acc.done + c.done, total: acc.total + c.total }),
    { done: 0, total: 0 },
  );
  const hasFooter = card.assignee || card.dueDate || checklistTotals.total > 0 || card.comments.length > 0 || card.attachments.length > 0;
  const isMentioned = Boolean(currentUserId) && card.comments.some((c) => c.mentionedUser?.id === currentUserId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-surface rounded-3xl shadow-sm shadow-black/5 p-5 flex flex-col gap-3 cursor-grab active:cursor-grabbing group",
        "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        isConcluded && "ring-1 ring-success/50",
        isDragging && "opacity-40",
        dimmed && "opacity-25",
      )}
    >
      {cover && imageMode === "cover" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (cover.type === "FILE") window.open(cover.url, "_blank");
            else setLightboxOpen(true);
          }}
          className={cn(
            "rounded-2xl overflow-hidden bg-surface-3 aspect-[1080/1440]",
            cover.type === "FILE" ? "cursor-pointer" : "cursor-zoom-in",
          )}
        >
          {cover.type === "VIDEO" ? (
            <video
              src={cover.url}
              muted
              preload="metadata"
              className="w-full h-full object-cover object-bottom pointer-events-none"
              style={{ transform: "scale(1.3)", transformOrigin: "50% 100%" }}
            />
          ) : cover.type === "FILE" ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 px-2 text-muted">
              <FileText size={28} strokeWidth={1.6} />
              <span className="text-[11px] font-medium text-center leading-tight line-clamp-2 break-all">
                {cover.name ?? "Arquivo"}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover.url}
              alt={cover.name ?? "Anexo"}
              className="w-full h-full object-cover object-bottom"
              style={{ transform: "scale(1.3)", transformOrigin: "50% 100%" }}
            />
          )}
        </button>
      )}

      {cover && lightboxOpen && cover.type !== "FILE" && (
        <div onClick={(e) => e.stopPropagation()}>
          <Lightbox url={cover.url} type={cover.type} alt={cover.name} onClose={() => setLightboxOpen(false)} />
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {cover &&
            imageMode === "thumbnail" &&
            (isConcluded ? (
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                <Check size={11} strokeWidth={3} className="text-white" />
              </span>
            ) : (
              <CheckCircle2 size={16} strokeWidth={2} className="flex-shrink-0 text-muted-2" />
            ))}
          <span
            className="h-1.5 w-9 rounded-full flex-shrink-0"
            style={{ background: PRIORITY_COLORS[card.priority] }}
            title={`Prioridade ${PRIORITY_LABELS[card.priority]}`}
          />
          {card.demandType && (
            <span
              className="h-1.5 w-9 rounded-full flex-shrink-0"
              style={{ background: card.demandType.color }}
              title={card.demandType.name}
            />
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onSchedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule();
              }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 cursor-pointer"
              title={card.scheduledAt ? "Reagendar publicação" : "Agendar publicação"}
            >
              <CalendarClock size={13} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPowerUpsOpen(true);
            }}
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 cursor-pointer"
            title="Power-up neste card"
          >
            <Zap size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Remover demanda"
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-surface-2 cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {cover && imageMode === "thumbnail" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (cover.type === "FILE") window.open(cover.url, "_blank");
              else setLightboxOpen(true);
            }}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden bg-surface-3",
              cover.type === "FILE" ? "cursor-pointer" : "cursor-zoom-in",
            )}
          >
            {cover.type === "VIDEO" ? (
              <video src={cover.url} muted preload="metadata" className="w-full h-full object-cover pointer-events-none" />
            ) : cover.type === "FILE" ? (
              <div className="w-full h-full flex items-center justify-center text-muted">
                <FileText size={20} strokeWidth={1.6} />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt={cover.name ?? "Anexo"} className="w-full h-full object-cover" />
            )}
          </button>
        )}
        {cover && imageMode === "thumbnail" ? (
          <p className={cn("text-sm leading-snug text-ink flex-1 min-w-0", statusAccent ? "font-bold" : "font-semibold")}>
            {card.title}
          </p>
        ) : (
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {isConcluded ? (
              <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-success flex items-center justify-center">
                <Check size={11} strokeWidth={3} className="text-white" />
              </span>
            ) : (
              <CheckCircle2 size={16} strokeWidth={2} className="flex-shrink-0 mt-0.5 text-muted-2" />
            )}
            <p className={cn("text-sm leading-snug text-ink flex-1", statusAccent ? "font-bold" : "font-semibold")}>
              {card.title}
            </p>
          </div>
        )}
      </div>

      {isConcluded && (
        <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold pl-2.5 pr-1 py-1 rounded-full bg-success text-white">
          <Check size={11} strokeWidth={3} /> Concluída
          {card.completedAt && onUnmarkComplete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUnmarkComplete();
              }}
              title="Desmarcar como concluída"
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors cursor-pointer"
            >
              <X size={10} strokeWidth={3} />
            </button>
          )}
        </span>
      )}

      <div className="flex flex-wrap gap-1.5 items-center">
        <ColorChip color={PRIORITY_COLORS[card.priority]}>{PRIORITY_LABELS[card.priority]}</ColorChip>
        {card.demandType && <ColorChip color={card.demandType.color}>{card.demandType.name}</ColorChip>}
        {card.client && (
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-ink max-w-40"
            title={card.client.name}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
            <span className="truncate">{card.client.name}</span>
          </span>
        )}
        {card.project && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-muted max-w-40"
            title={card.project.name}
          >
            <Briefcase size={10} className="flex-shrink-0" />
            <span className="truncate">{card.project.name}</span>
          </span>
        )}
        {card.post && (
          <ColorChip color={statusColor!}>
            {(() => {
              const Icon = POST_BADGE[card.post.status].icon;
              return <Icon size={11} />;
            })()}
            {POST_STATUS_LABELS[card.post.status]}
          </ColorChip>
        )}
        {card.scheduledNetwork && card.scheduledAt && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
              isMonoNetwork(card.scheduledNetwork) ? "bg-ink text-bg" : "text-white",
            )}
            style={
              isMonoNetwork(card.scheduledNetwork)
                ? undefined
                : { background: networkShapeBackground(card.scheduledNetwork) ?? undefined }
            }
            title={`Agendado para ${formatDateTime(card.scheduledAt)}`}
          >
            <SocialIcon network={card.scheduledNetwork} size={12} className="flex-shrink-0" />
            {formatDateTime(card.scheduledAt)}
          </span>
        )}
        {card.publishStatus === "PUBLISHED" && (
          <ColorChip color="#3fb56f">
            <Check size={11} />
            Publicado
          </ColorChip>
        )}
        {card.publishStatus === "FAILED" && (
          <ColorChip color="#e14b4b">
            <XCircle size={11} />
            Falhou
          </ColorChip>
        )}
      </div>

      {(card.post?.status === "CHANGES_REQUESTED" || card.post?.status === "REJECTED") && card.post.feedback && (
        <p className="text-[11px] leading-snug rounded-2xl px-3 py-2 bg-danger/10 text-ink">
          <span className="font-bold">
            {card.post.status === "REJECTED" ? "Cliente reprovou:" : "Cliente pediu alteração:"}
          </span>{" "}
          {card.post.feedback}
        </p>
      )}

      {hasFooter && (
        <div className="flex items-center gap-2 pt-2.5 border-t border-dotted border-border-2">
          {card.assignee && (
            <span
              className="inline-flex flex-shrink-0 rounded-full p-0.5 bg-surface-2"
              title={card.assignee.name}
            >
              <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={24} />
            </span>
          )}
          {card.dueDate && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted flex-shrink-0">
              <Calendar size={11} /> {formatDate(card.dueDate)}
            </span>
          )}
          <div className="flex items-center gap-2.5 ml-auto text-[11px] font-medium text-muted-2">
            {checklistTotals.total > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  checklistTotals.done === checklistTotals.total && "text-success",
                )}
              >
                <ListChecks size={12} /> {checklistTotals.done}/{checklistTotals.total}
              </span>
            )}
            {card.comments.length > 0 && (
              <span className={cn("inline-flex items-center gap-1", isMentioned && "text-accent font-semibold")} title={isMentioned ? "Você foi marcado num comentário" : undefined}>
                <MessageCircle size={12} /> {card.comments.length}
              </span>
            )}
            {card.attachments.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Paperclip size={12} /> {card.attachments.length}
              </span>
            )}
          </div>
        </div>
      )}

      {powerUpsOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <PowerUpsManager
            open={powerUpsOpen}
            onClose={() => setPowerUpsOpen(false)}
            columnId={card.columnId}
            cardId={card.id}
            columns={allColumns}
            users={users}
            demandTypes={demandTypes}
          />
        </div>
      )}
    </div>
  );
}
