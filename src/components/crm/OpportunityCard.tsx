"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { DottedDivider } from "@/components/ui/Dotted";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OpportunityData } from "./types";

/** Dias corridos desde a criação da oportunidade, só pra sinalizar "tempo parado" no card. */
function daysOpen(createdAt: string) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function OpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: OpportunityData;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const days = daysOpen(opportunity.createdAt);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-surface rounded-card shadow-sm shadow-black/5 p-4 flex flex-col gap-2.5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:shadow-black/10 hover:-translate-y-0.5",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <p className="flex-1 min-w-0 text-sm font-semibold text-ink leading-snug truncate">{opportunity.name}</p>
        {opportunity.responsible && (
          <Avatar
            name={opportunity.responsible.name}
            url={opportunity.responsible.avatarUrl}
            size={24}
            className="text-[10px] flex-shrink-0"
          />
        )}
      </div>

      {opportunity.monthlyValue != null && (
        <p className="text-[20px] font-light tracking-tight leading-none text-ink">
          {formatCurrency(opportunity.monthlyValue)}
          <span className="text-[11px] font-normal text-muted"> /mês</span>
        </p>
      )}

      <DottedDivider />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] text-muted-2 flex items-center gap-1.5 flex-shrink-0" title="Tempo desde a criação da oportunidade">
          <Clock size={11} className="flex-shrink-0" />
          {days === 0 ? "Criada hoje" : `Aberta há ${days}d`}
        </span>
        {opportunity.expectedCloseDate && (
          <span className="text-[11px] text-muted-2 flex items-center gap-1.5 flex-shrink-0">
            <Calendar size={11} className="flex-shrink-0" /> {formatDate(opportunity.expectedCloseDate)}
          </span>
        )}
      </div>
    </div>
  );
}
