"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Users, TrendingUp, Handshake, TrendingDown, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { StatPillRow } from "@/components/ui/StatPills";
import { formatCurrency } from "@/lib/format";
import type { SalesOpportunityInput } from "@/lib/schemas";
import { GoalCard } from "./GoalCard";
import { StageColumn } from "./StageColumn";
import { OpportunityCard } from "./OpportunityCard";
import { OpportunityModal } from "./OpportunityModal";
import type { StageData, OpportunityData, UserOption } from "./types";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

function findStageIdOfOpportunity(stages: StageData[], opportunityId: string) {
  return stages.find((s) => s.opportunities.some((o) => o.id === opportunityId))?.id;
}

export function CrmView({
  initialStages,
  users,
  isAdmin,
}: {
  initialStages: StageData[];
  users: UserOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [stages, setStages] = useState(initialStages);
  const { confirmDialog } = useConfirmDialog();
  const [activeOpportunity, setActiveOpportunity] = useState<OpportunityData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [goalRefreshKey, setGoalRefreshKey] = useState(0);
  const [editing, setEditing] = useState<OpportunityData | null>(null);
  const [defaultStageId, setDefaultStageId] = useState(stages[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const now = new Date();

  const stats = useMemo(() => {
    const all = stages.flatMap((s) => s.opportunities.map((o) => ({ ...o, stage: s })));
    const active = all.filter((o) => !o.stage.isWon && !o.stage.isLost);
    const wonThisMonth = all.filter((o) => {
      if (!o.stage.isWon || !o.closedAt) return false;
      const d = new Date(o.closedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const lost = all.filter((o) => o.stage.isLost);

    return {
      totalLeads: all.length,
      pipelineCount: active.length,
      pipelineValue: active.reduce((sum, o) => sum + (o.monthlyValue ?? 0), 0),
      wonCount: wonThisMonth.length,
      wonValue: wonThisMonth.reduce((sum, o) => sum + (o.monthlyValue ?? 0), 0),
      lostCount: lost.length,
      lostValue: lost.reduce((sum, o) => sum + (o.monthlyValue ?? 0), 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages]);

  function handleDragStart(event: DragStartEvent) {
    const oppId = event.active.id as string;
    const stage = stages.find((s) => s.opportunities.some((o) => o.id === oppId));
    setActiveOpportunity(stage?.opportunities.find((o) => o.id === oppId) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const fromStageId = findStageIdOfOpportunity(stages, activeId);
    const toStageId = findStageIdOfOpportunity(stages, overId) ?? overId;
    if (!fromStageId || !toStageId || fromStageId === toStageId) return;
    if (!stages.some((s) => s.id === toStageId)) return;

    setStages((prev) => {
      const fromStage = prev.find((s) => s.id === fromStageId)!;
      const opp = fromStage.opportunities.find((o) => o.id === activeId);
      if (!opp) return prev;

      return prev.map((stage) => {
        if (stage.id === fromStageId) {
          return { ...stage, opportunities: stage.opportunities.filter((o) => o.id !== activeId) };
        }
        if (stage.id === toStageId) {
          const overIndex = stage.opportunities.findIndex((o) => o.id === overId);
          const insertAt = overIndex >= 0 ? overIndex : stage.opportunities.length;
          const next = [...stage.opportunities];
          next.splice(insertAt, 0, { ...opp, stageId: toStageId });
          return { ...stage, opportunities: next };
        }
        return stage;
      });
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveOpportunity(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const stageId = findStageIdOfOpportunity(stages, activeId);
    if (!stageId) return;

    let finalStages = stages;
    if (activeId !== overId) {
      const stage = stages.find((s) => s.id === stageId)!;
      const oldIndex = stage.opportunities.findIndex((o) => o.id === activeId);
      const overIndex = stage.opportunities.findIndex((o) => o.id === overId);
      if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
        finalStages = stages.map((s) =>
          s.id === stageId ? { ...s, opportunities: arrayMove(s.opportunities, oldIndex, overIndex) } : s,
        );
        setStages(finalStages);
      }
    }

    const affected = finalStages.filter(
      (s) => s.id === stageId || s.opportunities.some((o) => o.id === activeId),
    );
    const payload = {
      stages: affected.map((s) => ({ stageId: s.id, opportunityIds: s.opportunities.map((o) => o.id) })),
    };

    await fetch("/api/sales/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setGoalRefreshKey((n) => n + 1);
    router.refresh();
  }

  function openCreate(stageId: string) {
    setEditing(null);
    setDefaultStageId(stageId);
    setModalOpen(true);
  }

  function openEdit(opportunity: OpportunityData) {
    setEditing(opportunity);
    setDefaultStageId(opportunity.stageId);
    setModalOpen(true);
  }

  async function handleSubmit(data: SalesOpportunityInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/sales/opportunities/${editing.id}` : "/api/sales/opportunities";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar oportunidade");
      const opportunity = await res.json();

      setStages((prev) => {
        const without = prev.map((s) => ({
          ...s,
          opportunities: s.opportunities.filter((o) => o.id !== opportunity.id),
        }));
        return without.map((s) =>
          s.id === opportunity.stageId ? { ...s, opportunities: [...s.opportunities, opportunity] } : s,
        );
      });
      setModalOpen(false);
      setGoalRefreshKey((n) => n + 1);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!(await confirmDialog("Excluir esta oportunidade?", { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/sales/opportunities/${editing.id}`, { method: "DELETE" });
    if (res.ok) {
      setStages((prev) => prev.map((s) => ({ ...s, opportunities: s.opportunities.filter((o) => o.id !== editing.id) })));
      setModalOpen(false);
      setGoalRefreshKey((n) => n + 1);
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader
        title="CRM"
        description="Pipeline de vendas e metas comerciais da agência."
        actions={
          <Button size="lg" onClick={() => openCreate(stages[0]?.id ?? "")}>
            <Plus size={15} /> Nova oportunidade
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-8 items-stretch">
        <div className="flex flex-col gap-6">
          <GoalCard isAdmin={isAdmin} refreshKey={goalRefreshKey} />

          <Card padding="lg">
            <StatPillRow
              items={[
                { label: "Total de leads", display: stats.totalLeads, tone: "dark", weight: stats.totalLeads },
                { label: "Pipeline", display: stats.pipelineCount, tone: "accent", weight: stats.pipelineCount },
                { label: "Vendas feitas (mês)", display: stats.wonCount, tone: "hatch", weight: stats.wonCount },
                { label: "Vendas perdidas", display: stats.lostCount, tone: "outline", weight: stats.lostCount },
              ]}
            />
          </Card>
        </div>

        <Panel padding="lg" className="flex flex-col">
          <div className="flex items-center gap-3">
            <IconChip tone="panel">
              <Handshake size={18} strokeWidth={2} />
            </IconChip>
            <h2 className="text-base font-semibold text-panel-ink">Resumo do mês</h2>
          </div>

          <p className="text-[36px] font-light leading-none tracking-tight text-panel-ink mt-8">
            {formatCurrency(stats.wonValue)}
          </p>
          <p className="text-[13px] text-panel-muted mt-2">/mês em novas contas</p>

          <div className="mt-auto">
            <div className="border-t border-dotted border-panel-2 my-6" />

            <div className="flex flex-col gap-4">
              <div className="flex items-baseline gap-2.5 text-sm">
                <span className="flex items-center gap-2 text-panel-muted flex-shrink-0">
                  <TrendingUp size={13} /> Pipeline
                </span>
                <span className="flex-1 border-b border-dotted border-panel-2 -translate-y-1" />
                <span className="text-panel-ink font-medium flex-shrink-0 whitespace-nowrap tabular-nums">{formatCurrency(stats.pipelineValue)}/mês</span>
              </div>
              <div className="flex items-baseline gap-2.5 text-sm">
                <span className="flex items-center gap-2 text-panel-muted flex-shrink-0">
                  <TrendingDown size={13} /> Vendas perdidas
                </span>
                <span className="flex-1 border-b border-dotted border-panel-2 -translate-y-1" />
                <span className="text-panel-ink font-medium flex-shrink-0 whitespace-nowrap tabular-nums">{formatCurrency(stats.lostValue)}/mês</span>
              </div>
              <div className="flex items-baseline gap-2.5 text-sm">
                <span className="flex items-center gap-2 text-panel-muted flex-shrink-0">
                  <Users size={13} /> Total de leads
                </span>
                <span className="flex-1 border-b border-dotted border-panel-2 -translate-y-1" />
                <span className="text-panel-ink font-medium flex-shrink-0 tabular-nums">{stats.totalLeads}</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <DndContext
        id="crm-pipeline"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-5 pt-0.5 pb-4 min-w-max items-start">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                onAddOpportunity={openCreate}
                onOpportunityClick={openEdit}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeOpportunity && (
            <div className="w-72">
              <OpportunityCard opportunity={activeOpportunity} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <OpportunityModal
        key={editing?.id ?? "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        onDelete={editing ? handleDelete : undefined}
        editing={editing}
        stages={stages}
        defaultStageId={defaultStageId}
        users={users}
        submitting={submitting}
      />
    </div>
  );
}
