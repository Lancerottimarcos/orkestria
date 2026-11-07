"use client";

import { Fragment, type ReactNode } from "react";
import {
  ListTodo,
  Send,
  CheckCircle2,
  MessageSquareWarning,
  Columns3,
  Layers,
  Flag,
  Users,
  FolderKanban,
  UserCog,
  Clock,
  Flame,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
} from "recharts";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { BigStat } from "@/components/ui/StatPills";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { PRIORITY_LABELS, PRIORITY_COLORS, POST_STATUS_LABELS, POST_STATUS_COLORS } from "@/lib/labels";

type NameCount = { name: string; count: number };
type ColorCount = { name: string; color: string; count: number };

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Columns3; children: ReactNode }) {
  return (
    <Card padding="lg" className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <IconChip tone="accent" size="sm">
          <Icon size={15} strokeWidth={2} />
        </IconChip>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted py-6 text-center">{children}</p>;
}

function DonutChart({ data }: { data: ColorCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <EmptyHint>Nenhum dado ainda.</EmptyHint>;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <PieChart width={140} height={140}>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={44}
          outerRadius={64}
          paddingAngle={3}
          cornerRadius={6}
          stroke="var(--color-surface)"
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0];
            const pct = (((entry.value as number) / total) * 100).toFixed(0);
            return (
              <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                <p className="font-semibold text-ink">
                  {entry.name as string}: {entry.value as number} ({pct}%)
                </p>
              </div>
            );
          }}
        />
      </PieChart>
      <div className="flex-1 min-w-40 flex flex-col gap-2.5">
        {data.map((entry) => (
          <DottedRow
            key={entry.name}
            icon={<span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />}
            label={entry.name}
            value={entry.count}
          />
        ))}
      </div>
    </div>
  );
}

function ColumnBarChart({ data }: { data: ColorCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return <EmptyHint>Nenhuma coluna cadastrada.</EmptyHint>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="name"
          stroke="var(--color-muted-2)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis stroke="var(--color-muted-2)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "color-mix(in srgb, var(--color-ink) 6%, transparent)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const entry = payload[0];
            return (
              <div className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                <p className="font-semibold text-ink">
                  {entry.payload.name}: {entry.value as number}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[8, 8, 8, 8]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PanelRankedList({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: typeof Columns3;
  data: NameCount[];
}) {
  const max = data[0]?.count || 1;
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex items-center gap-3">
        <IconChip tone="panel" size="sm">
          <Icon size={15} strokeWidth={2} />
        </IconChip>
        <h3 className="text-base font-semibold text-panel-ink">{title}</h3>
      </div>
      {data.length === 0 ? (
        <p className="text-[13px] text-panel-muted py-4 text-center">Nenhum dado ainda.</p>
      ) : (
        <div className="flex flex-col">
          {data.map((d, i) => (
            <Fragment key={d.name}>
              {i > 0 && <DottedDivider />}
              <div className="flex items-center gap-3 py-3.5">
                <span className="w-7 h-7 rounded-full bg-panel-2 text-panel-ink text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm text-panel-ink truncate">{d.name}</span>
                    <span className="text-sm font-semibold text-panel-ink flex-shrink-0 tabular-nums">{d.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(d.count / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

export function PerformanceDashboard({
  totalCards,
  byColumn,
  byType,
  byPriority,
  byClient,
  byProject,
  byAssignee,
  approvalStats,
  capacityByPerson,
}: {
  totalCards: number;
  byColumn: ColorCount[];
  byType: ColorCount[];
  byPriority: { priority: "HIGH" | "MEDIUM" | "LOW"; count: number }[];
  byClient: NameCount[];
  byProject: NameCount[];
  byAssignee: NameCount[];
  approvalStats: { total: number; pending: number; approved: number; changesRequested: number; rejected: number; avgApprovalHours: number | null };
  capacityByPerson: { name: string; billableHours: number; totalHours: number; activeCards: number }[];
}) {
  const reviewed = approvalStats.approved + approvalStats.changesRequested + approvalStats.rejected;
  const approvalRate = reviewed > 0 ? Math.round((approvalStats.approved / reviewed) * 100) : null;

  const priorityData: ColorCount[] = byPriority.map((p) => ({
    name: PRIORITY_LABELS[p.priority],
    color: PRIORITY_COLORS[p.priority],
    count: p.count,
  }));

  const approvalData: ColorCount[] = [
    { name: POST_STATUS_LABELS.PENDING, color: POST_STATUS_COLORS.PENDING, count: approvalStats.pending },
    { name: POST_STATUS_LABELS.APPROVED, color: POST_STATUS_COLORS.APPROVED, count: approvalStats.approved },
    {
      name: POST_STATUS_LABELS.CHANGES_REQUESTED,
      color: POST_STATUS_COLORS.CHANGES_REQUESTED,
      count: approvalStats.changesRequested,
    },
    { name: POST_STATUS_LABELS.REJECTED, color: POST_STATUS_COLORS.REJECTED, count: approvalStats.rejected },
  ].filter((d) => d.count > 0);

  // Reordena (sem recalcular nada) o mesmo array de capacidade só pra achar
  // quem tem mais demandas ativas agora - é a resposta mais rápida pra "quem
  // está sobrecarregado" ao abrir a tela, com o detalhe pessoa a pessoa
  // continuando disponível mais abaixo.
  const mostLoaded = [...capacityByPerson]
    .filter((p) => p.activeCards > 0)
    .sort((a, b) => b.activeCards - a.activeCards)
    .slice(0, 4);

  return (
    <div>
      <PageHeader
        title="Desempenho"
        description="Visão geral de demandas e aprovações da agência - sem dados financeiros"
      />

      <Card padding="lg" className="mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-8">
          <BigStat
            value={totalCards}
            label="Total de demandas"
            icon={<ListTodo size={15} strokeWidth={1.8} />}
          />
          <BigStat
            value={approvalStats.total}
            label="Enviadas p/ aprovação"
            icon={<Send size={15} strokeWidth={1.8} />}
          />
          <BigStat
            value={approvalRate === null ? "-" : `${approvalRate}%`}
            label="Taxa de aprovação"
            icon={<CheckCircle2 size={15} strokeWidth={1.8} />}
          />
          <BigStat
            value={approvalStats.changesRequested}
            label="Alterações solicitadas"
            icon={<MessageSquareWarning size={15} strokeWidth={1.8} />}
          />
          <BigStat
            value={approvalStats.avgApprovalHours === null ? "-" : `${approvalStats.avgApprovalHours.toFixed(0)}h`}
            label="Tempo médio p/ decisão"
            icon={<Clock size={15} strokeWidth={1.8} />}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Panel padding="lg" className="flex flex-col">
          <div className="flex items-center gap-3">
            <IconChip tone="panel" size="sm">
              <Flame size={15} strokeWidth={2} />
            </IconChip>
            <h3 className="text-base font-semibold text-panel-ink">Quem está sobrecarregado</h3>
          </div>
          <p className="text-[13px] text-panel-muted mt-2">Ranking por demandas ativas neste momento.</p>

          {mostLoaded.length === 0 ? (
            <p className="text-[13px] text-panel-muted py-8 text-center">Ninguém com demandas ativas no momento.</p>
          ) : (
            <div className="flex flex-col mt-5">
              {mostLoaded.map((p, i) => (
                <Fragment key={p.name}>
                  {i > 0 && <div className="border-t border-dotted border-panel-2" />}
                  <div className="flex items-center gap-3 py-3">
                    <span className="w-7 h-7 rounded-full bg-panel-2 text-panel-ink text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-panel-ink truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-panel-ink bg-panel-2 px-3 py-1.5 rounded-full tabular-nums flex-shrink-0">
                      {p.activeCards} ativa{p.activeCards === 1 ? "" : "s"}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </Panel>

        <Section title="Status de aprovação" icon={CheckCircle2}>
          <DonutChart data={approvalData} />
        </Section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-5">
        <Section title="Demandas por coluna do quadro" icon={Columns3}>
          <ColumnBarChart data={byColumn} />
        </Section>
        <Section title="Demandas por tipo" icon={Layers}>
          <DonutChart data={byType} />
        </Section>
        <Section title="Demandas por prioridade" icon={Flag}>
          <DonutChart data={priorityData} />
        </Section>
      </div>

      <Panel padding="lg" className="mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-8">
          <PanelRankedList title="Clientes com mais demandas" icon={Users} data={byClient} />
          <PanelRankedList title="Projetos com mais demandas" icon={FolderKanban} data={byProject} />
          <PanelRankedList title="Demandas por responsável" icon={UserCog} data={byAssignee} />
        </div>
      </Panel>

      <Panel padding="lg">
        <div className="flex items-center gap-3 mb-5">
          <IconChip tone="panel" size="sm">
            <Clock size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-panel-ink">Capacidade por pessoa (últimos 30 dias)</h3>
        </div>
        {capacityByPerson.length === 0 ? (
          <p className="text-[13px] text-panel-muted py-4 text-center">Nenhuma hora apontada ainda.</p>
        ) : (
          <div className="flex flex-col">
            {capacityByPerson.map((p, i) => (
              <Fragment key={p.name}>
                {i > 0 && <DottedDivider />}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-3.5">
                  <span className="text-sm font-medium text-panel-ink truncate">{p.name}</span>
                  <span className="text-xs text-panel-muted tabular-nums flex-shrink-0">
                    {p.totalHours.toFixed(1)}h apontadas
                    {p.billableHours !== p.totalHours && ` (${p.billableHours.toFixed(1)}h faturável)`}
                    {" · "}
                    {p.activeCards} demanda{p.activeCards === 1 ? "" : "s"} ativa{p.activeCards === 1 ? "" : "s"}
                  </span>
                </div>
              </Fragment>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
