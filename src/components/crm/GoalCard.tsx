"use client";

import { useEffect, useRef, useState } from "react";
import { Target, Trophy, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { PillProgress } from "@/components/ui/PillProgress";
import { Confetti } from "@/components/ui/Confetti";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type GoalState = { target: number; closedCount: number; closedMonthlyValue: number };

export function GoalCard({ isAdmin, refreshKey = 0 }: { isAdmin: boolean; refreshKey?: number }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [goal, setGoal] = useState<GoalState | null>(null);
  const [editing, setEditing] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const wasCompleteRef = useRef(false);

  function applyGoal(data: GoalState) {
    const isComplete = data.target > 0 && data.closedCount >= data.target;
    if (isComplete && !wasCompleteRef.current) {
      setConfettiTrigger((n) => n + 1);
    }
    wasCompleteRef.current = isComplete;
    setGoal(data);
  }

  useEffect(() => {
    fetch(`/api/sales/goal?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(applyGoal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function saveTarget() {
    const target = Math.max(0, Number(targetInput) || 0);
    setSaving(true);
    const res = await fetch("/api/sales/goal", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, target }),
    });
    setSaving(false);
    if (res.ok) {
      applyGoal(await res.json());
      setEditing(false);
    }
  }

  if (!goal) {
    return <div className="bg-surface rounded-card shadow-sm shadow-black/5 p-8 h-44 animate-pulse" />;
  }

  const pct = goal.target > 0 ? Math.min(100, Math.round((goal.closedCount / goal.target) * 100)) : 0;
  const complete = goal.target > 0 && goal.closedCount >= goal.target;

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <Confetti trigger={confettiTrigger} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          <IconChip size="lg" tone={complete ? "solid" : "accent"}>
            {complete ? <Trophy size={22} strokeWidth={1.8} /> : <Target size={22} strokeWidth={1.8} />}
          </IconChip>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">
              {complete ? "Meta do mês batida!" : `Meta de novos clientes, ${MONTH_NAMES[month - 1]}`}
            </p>
            <p className="text-[13px] text-muted mt-1">
              {goal.closedCount} de {goal.target || "-"} clientes fechados
              {goal.closedMonthlyValue > 0 && ` · ${formatCurrency(goal.closedMonthlyValue)}/mês em novas contas`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {isAdmin && (
            editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveTarget()}
                  className="w-24 bg-surface-2 border border-border rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={saveTarget}
                  disabled={saving}
                  className="w-9 h-9 flex-shrink-0 rounded-full bg-accent text-black flex items-center justify-center cursor-pointer transition-opacity disabled:opacity-60"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTargetInput(String(goal.target));
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent border border-border-2 rounded-full px-4 py-2 hover:border-accent transition-colors cursor-pointer"
              >
                <Pencil size={12} /> Editar meta
              </button>
            )
          )}
          <span
            className={cn(
              "text-[40px] font-light leading-none tracking-tight",
              complete ? "text-success" : "text-ink",
            )}
          >
            {pct}%
          </span>
        </div>
      </div>

      <PillProgress
        className="mt-6"
        value={pct}
        tone={complete ? "dark" : "accent"}
        label={
          goal.closedMonthlyValue > 0
            ? `${formatCurrency(goal.closedMonthlyValue)}/mês`
            : `${goal.closedCount} de ${goal.target || "-"} clientes`
        }
      />
    </Card>
  );
}
