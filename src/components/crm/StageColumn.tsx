"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { formatCurrency } from "@/lib/format";
import { OpportunityCard } from "./OpportunityCard";
import type { StageData, OpportunityData } from "./types";

export function StageColumn({
  stage,
  onAddOpportunity,
  onOpportunityClick,
}: {
  stage: StageData;
  onAddOpportunity: (stageId: string) => void;
  onOpportunityClick: (opportunity: OpportunityData) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  const color = stage.color || "var(--color-accent)";
  const totalValue = stage.opportunities.reduce((sum, o) => sum + (o.monthlyValue ?? 0), 0);

  return (
    <div className="w-72 flex-shrink-0 flex flex-col max-h-full">
      <div className="flex flex-col gap-1 px-1.5 pb-3">
        <div className="flex items-center gap-2.5">
          <IconChip size="sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
          </IconChip>
          <span className="flex-1 text-sm font-semibold text-ink truncate">{stage.name}</span>
          <span className="text-xs font-semibold text-muted bg-surface shadow-sm shadow-black/5 px-2.5 py-1 rounded-full flex-shrink-0">
            {stage.opportunities.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-[11px] text-muted-2 pl-10 tabular-nums">{formatCurrency(totalValue)}/mês</p>
        )}
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-0.5 py-0.5 flex flex-col gap-3 min-h-24">
        <SortableContext items={stage.opportunities.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {stage.opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} onClick={() => onOpportunityClick(opp)} />
          ))}
        </SortableContext>
        {stage.opportunities.length === 0 && (
          <div className="bg-hatch border border-dotted border-border-2 rounded-3xl py-8 px-4 text-center">
            <p className="text-xs text-muted-2">Solte um card aqui ou crie uma oportunidade</p>
          </div>
        )}
      </div>

      <div className="pt-3 px-0.5">
        <button
          type="button"
          onClick={() => onAddOpportunity(stage.id)}
          className="w-full py-2.5 rounded-full border border-dotted border-border-2 text-muted text-[13px] font-medium flex items-center justify-center gap-1.5 hover:border-accent hover:text-accent transition-colors cursor-pointer"
        >
          <Plus size={14} /> Nova oportunidade
        </button>
      </div>
    </div>
  );
}
