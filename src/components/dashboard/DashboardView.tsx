import Link from "next/link";
import { Fragment, ReactNode } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  FolderKanban,
  Columns3,
  AlertTriangle,
  Clock,
  TrendingUp,
  Trophy,
  NotebookText,
  ListChecks,
  Users2,
  CalendarClock,
  ClipboardCheck,
  Wallet2,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Panel } from "@/components/ui/Card";
import { StatPillRow, type StatPillItem } from "@/components/ui/StatPills";
import { ThinProgress } from "@/components/ui/PillProgress";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { IconChip } from "@/components/ui/IconChip";
import { RevenueChart } from "./RevenueChart";
import { BalanceChart } from "./BalanceChart";
import { ProjectStatusChart } from "./ProjectStatusChart";
import { ClientStatusChart } from "./ClientStatusChart";
import { ApprovalStatusChart } from "./ApprovalStatusChart";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type PaymentRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  dueDate: string;
  label: string | null;
};

type RenewalRow = {
  id: string;
  name: string;
  value: number;
  renewalDate: string;
  client: { id: string; name: string } | null;
};

type Financials = {
  monthIncome: number;
  monthExpense: number;
  incomeTrendPct: number | null;
  expenseTrendPct: number | null;
  trend: { label: string; income: number; expense: number }[];
  topClients: { name: string; amount: number }[];
  expensesByCategory: { name: string; amount: number }[];
  overdueCount: number;
  overdueTotal: number;
  overdue: PaymentRow[];
  upcoming: PaymentRow[];
  renewalsUpcoming: RenewalRow[];
} | null;

type NoteSummary = { id: string; title: string; updatedAt: string; label: string | null };
type ChecklistSummary = { id: string; title: string; total: number; done: number };
type DeadlineSummary = { id: string; name: string; dueDate: string; clientName: string };
type ApprovalSummary = { id: string; title: string; clientName: string; createdAt: string };

function daysUntil(dueDate: string) {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
}

function daysLate(dueDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000));
}

function trendLabel(pct: number | null) {
  if (pct === null) return undefined;
  const arrow = pct >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct).toFixed(0)}%`;
}

function trimDecimal(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(".", ",");
}

function compactCurrency(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${trimDecimal(abs / 1_000_000)} mi`;
  if (abs >= 1000) return `${sign}R$ ${trimDecimal(abs / 1000)} mil`;
  return formatCurrency(value);
}

function SectionCard({
  title,
  icon: Icon,
  danger,
  right,
  href,
  hrefLabel,
  padding = "md",
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  danger?: boolean;
  right?: ReactNode;
  href?: string;
  hrefLabel?: string;
  padding?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card padding={padding} className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <IconChip
              tone={danger ? "default" : "accent"}
              size="sm"
              className={danger ? "bg-danger/10 text-danger" : undefined}
            >
              <Icon size={15} strokeWidth={2} />
            </IconChip>
          )}
          <h2 className={cn("text-base font-semibold truncate", danger ? "text-danger" : "text-ink")}>
            {title}
          </h2>
        </div>
        {right}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
      {href && (
        <div className="mt-6">
          <Link
            href={href}
            className={cn(
              "inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition-colors",
              danger
                ? "bg-danger/10 text-danger hover:bg-danger/20"
                : "bg-surface-2 text-ink hover:bg-surface-3",
            )}
          >
            {hrefLabel} →
          </Link>
        </div>
      )}
    </Card>
  );
}

function FeedRow({
  icon: Icon,
  title,
  subtitle,
  right,
  rightTone,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  right: string;
  rightTone?: "success" | "danger";
}) {
  return (
    <div className="flex items-center gap-3">
      <IconChip size="sm">
        <Icon size={14} strokeWidth={2} />
      </IconChip>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink truncate min-w-0">{title}</p>
          <span
            className={cn(
              "text-xs font-semibold flex-shrink-0 tabular-nums",
              rightTone === "success" && "text-success",
              rightTone === "danger" && "text-danger",
              !rightTone && "text-muted",
            )}
          >
            {right}
          </span>
        </div>
        <p className="text-xs text-muted truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function PanelRow({
  icon: Icon,
  title,
  subtitle,
  right,
  rightTone,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  right: string;
  rightTone?: "success" | "danger";
}) {
  return (
    <div className="flex items-center gap-3">
      <IconChip tone="panel" size="sm">
        <Icon size={14} strokeWidth={2} />
      </IconChip>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-panel-ink truncate min-w-0">{title}</p>
          <span
            className={cn(
              "text-xs font-semibold flex-shrink-0 tabular-nums",
              rightTone === "success" && "text-success",
              rightTone === "danger" && "text-danger",
              !rightTone && "text-panel-muted",
            )}
          >
            {right}
          </span>
        </div>
        <p className="text-xs text-panel-muted truncate mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function PanelDivider() {
  return <div className="border-t border-dotted border-panel-2" />;
}

function RankRow({
  index,
  name,
  amount,
  pct,
  tone,
}: {
  index: number;
  name: string;
  amount: number;
  pct: number;
  tone: "accent" | "danger";
}) {
  return (
    <div className="flex items-center gap-3">
      <IconChip size="sm" className="text-xs font-semibold text-ink">
        {index + 1}
      </IconChip>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-sm font-medium text-ink truncate">{name}</span>
          <span className="text-sm font-semibold text-ink flex-shrink-0 tabular-nums">
            {formatCurrency(amount)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn("h-full rounded-full", tone === "accent" ? "bg-accent" : "bg-danger")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted">{children}</p>;
}

function KanbanBoardsList({
  boards,
  hiddenCount,
  max,
}: {
  boards: { id: string; name: string; clientName: string | null; count: number }[];
  hiddenCount: number;
  max: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {boards.length === 0 && <EmptyHint>Nenhum quadro criado ainda.</EmptyHint>}
      {boards.map((board) => (
        <div key={board.id} className="flex items-center gap-4">
          <span className="text-[13px] text-muted flex-1 min-w-0 truncate">
            {board.name}
            {board.clientName && <span className="text-muted-2"> · {board.clientName}</span>}
          </span>
          <div className="flex-1">
            <ThinProgress value={Math.min(100, (board.count / max) * 100)} />
          </div>
          <span className="text-sm font-semibold text-ink w-6 text-right tabular-nums">{board.count}</span>
        </div>
      ))}
      {hiddenCount > 0 && <p className="text-xs text-muted">+{hiddenCount} outros quadros</p>}
    </div>
  );
}

export function DashboardView({
  userName,
  isAdmin,
  activeClients,
  clientsThisMonth,
  projectsInProgress,
  projectsThisMonth,
  projectsByStatus,
  kanbanByBoard,
  financials,
  notesSummary,
  checklistsSummary,
  clientsByStatus,
  deadlinesSummary,
  approvalsSummary,
  pendingApprovalsCount,
  approvalStatusBreakdown,
}: {
  userName: string;
  isAdmin: boolean;
  activeClients: number;
  clientsThisMonth: number;
  projectsInProgress: number;
  projectsThisMonth: number;
  projectsByStatus: { status: string; count: number }[];
  kanbanByBoard: { id: string; name: string; clientName: string | null; count: number }[];
  financials: Financials;
  notesSummary: NoteSummary[];
  checklistsSummary: ChecklistSummary[];
  clientsByStatus: { status: string; count: number }[];
  deadlinesSummary: DeadlineSummary[];
  approvalsSummary: ApprovalSummary[];
  pendingApprovalsCount: number;
  approvalStatusBreakdown: { status: string; count: number }[];
}) {
  const firstName = userName.split(" ")[0];
  const kanbanTotal = kanbanByBoard.reduce((sum, b) => sum + b.count, 0);
  const maxKanban = Math.max(1, ...kanbanByBoard.map((b) => b.count));
  const KANBAN_BOARD_CAP = 6;
  const visibleBoards = kanbanByBoard.slice(0, KANBAN_BOARD_CAP);
  const hiddenBoardsCount = Math.max(0, kanbanByBoard.length - KANBAN_BOARD_CAP);
  const hasFinancePanel = isAdmin && !!financials;

  const statItems: StatPillItem[] = [
    {
      label: "Clientes",
      tone: "accent",
      weight: activeClients,
      display: (
        <>
          <span className="text-base">{activeClients}</span>
          {clientsThisMonth > 0 && (
            <span className="ml-2 text-xs font-medium opacity-70">+{clientsThisMonth} no mês</span>
          )}
        </>
      ),
    },
    {
      label: "Projetos",
      tone: "dark",
      weight: projectsInProgress,
      display: (
        <>
          <span className="text-base">{projectsInProgress}</span>
          {projectsThisMonth > 0 && (
            <span className="ml-2 text-xs font-medium opacity-70">+{projectsThisMonth} no mês</span>
          )}
        </>
      ),
    },
    {
      label: "Demandas",
      tone: "hatch",
      weight: kanbanTotal,
      display: <span className="text-base">{kanbanTotal}</span>,
    },
    {
      label: "Aprovações",
      tone: "outline",
      weight: pendingApprovalsCount,
      display: <span className="text-base">{pendingApprovalsCount}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title={`Olá, ${firstName || "bem-vindo"}`} description="Visão geral da agência" />

      {/* Números principais em pílulas */}
      <StatPillRow items={statItems} className="mb-8" />

      {/* Hero: gráfico principal + painel escuro de contraste */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-start">
        {hasFinancePanel && financials ? (
          <>
            <SectionCard
              title="Faturamento x Despesas"
              icon={Wallet}
              padding="lg"
              className="lg:col-span-8"
              right={
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-medium text-muted">Saldo</p>
                  <p className="text-[28px] font-light tracking-tight leading-none text-ink mt-1 tabular-nums">
                    {formatCurrency(financials.monthIncome - financials.monthExpense)}
                  </p>
                </div>
              }
            >
              <RevenueChart data={financials.trend} />
            </SectionCard>

            <Panel padding="lg" className="lg:col-span-4 flex flex-col">
              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <IconChip tone="panel" size="sm">
                      <AlertTriangle size={15} strokeWidth={2} className="text-danger" />
                    </IconChip>
                    <h2 className="text-base font-semibold text-panel-ink truncate">Pagamentos atrasados</h2>
                  </div>
                  {financials.overdueCount > 0 && (
                    <span className="text-xs font-semibold text-danger flex-shrink-0 tabular-nums">
                      {formatCurrency(financials.overdueTotal)}
                    </span>
                  )}
                </div>
                <div className="mt-5">
                  {financials.overdue.length === 0 ? (
                    <p className="text-[13px] text-panel-muted">Nenhum pagamento atrasado.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {financials.overdue.map((t, i) => (
                        <Fragment key={t.id}>
                          {i > 0 && <PanelDivider />}
                          <PanelRow
                            icon={t.type === "INCOME" ? ArrowUpCircle : ArrowDownCircle}
                            title={t.description}
                            subtitle={`${t.label ? `${t.label} · ` : ""}${daysLate(t.dueDate)}d em atraso`}
                            right={`${t.type === "INCOME" ? "+" : "-"} ${formatCurrency(t.amount)}`}
                            rightTone={t.type === "INCOME" ? "success" : "danger"}
                          />
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-dotted border-panel-2 my-6" />

                <div className="flex items-center gap-3">
                  <IconChip tone="panel" size="sm">
                    <Clock size={15} strokeWidth={2} />
                  </IconChip>
                  <h2 className="text-base font-semibold text-panel-ink truncate">Próximos pagamentos</h2>
                </div>
                <div className="mt-5">
                  {financials.upcoming.length === 0 ? (
                    <p className="text-[13px] text-panel-muted">Nenhum lançamento pendente.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {financials.upcoming.map((t, i) => (
                        <Fragment key={t.id}>
                          {i > 0 && <PanelDivider />}
                          <PanelRow
                            icon={t.type === "INCOME" ? ArrowUpCircle : ArrowDownCircle}
                            title={t.description}
                            subtitle={`${t.label ? `${t.label} · ` : ""}Vence em ${formatDate(t.dueDate)}`}
                            right={`${t.type === "INCOME" ? "+" : "-"} ${formatCurrency(t.amount)}`}
                            rightTone={t.type === "INCOME" ? "success" : "danger"}
                          />
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {financials.renewalsUpcoming.length > 0 && (
                  <>
                    <div className="border-t border-dotted border-panel-2 my-6" />
                    <div className="flex items-center gap-3">
                      <IconChip tone="panel" size="sm">
                        <RefreshCw size={15} strokeWidth={2} />
                      </IconChip>
                      <h2 className="text-base font-semibold text-panel-ink truncate">Renovações próximas</h2>
                    </div>
                    <div className="mt-5">
                      <div className="flex flex-col gap-3">
                        {financials.renewalsUpcoming.map((r, i) => (
                          <Fragment key={r.id}>
                            {i > 0 && <PanelDivider />}
                            <PanelRow
                              icon={RefreshCw}
                              title={r.name}
                              subtitle={`${r.client ? `${r.client.name} · ` : ""}Renova em ${formatDate(r.renewalDate)}`}
                              right={formatCurrency(r.value)}
                            />
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6">
                <Link
                  href="/financeiro"
                  className="inline-flex items-center rounded-full bg-panel-2 px-4 py-2 text-xs font-semibold text-panel-ink hover:opacity-80 transition-opacity"
                >
                  Ver financeiro completo →
                </Link>
              </div>
            </Panel>
          </>
        ) : (
          <>
            <SectionCard
              title="Demandas por quadro"
              icon={Columns3}
              padding="lg"
              className="lg:col-span-8"
              href="/kanban"
              hrefLabel="Ver quadros completos"
              right={
                <span className="text-[28px] font-light tracking-tight leading-none text-ink flex-shrink-0">
                  {kanbanTotal}
                </span>
              }
            >
              <KanbanBoardsList boards={visibleBoards} hiddenCount={hiddenBoardsCount} max={maxKanban} />
            </SectionCard>

            <Panel padding="lg" className="lg:col-span-4 flex flex-col">
              <div className="max-h-[320px] overflow-y-auto pr-1 -mr-1">
                <div className="flex items-center gap-3">
                  <IconChip tone="panel" size="sm">
                    <CalendarClock size={15} strokeWidth={2} />
                  </IconChip>
                  <h2 className="text-base font-semibold text-panel-ink truncate">Próximos prazos</h2>
                </div>
                <div className="mt-5">
                  {deadlinesSummary.length === 0 ? (
                    <p className="text-[13px] text-panel-muted">Nenhum prazo agendado.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {deadlinesSummary.map((d, i) => (
                        <Fragment key={d.id}>
                          {i > 0 && <PanelDivider />}
                          <PanelRow
                            icon={CalendarClock}
                            title={d.name}
                            subtitle={d.clientName}
                            right={`${daysUntil(d.dueDate)}d · ${formatDate(d.dueDate)}`}
                          />
                        </Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6">
                <Link
                  href="/projetos"
                  className="inline-flex items-center rounded-full bg-panel-2 px-4 py-2 text-xs font-semibold text-panel-ink hover:opacity-80 transition-opacity"
                >
                  Ver todos os projetos →
                </Link>
              </div>
            </Panel>
          </>
        )}
      </div>

      {/* Distribuições */}
      {hasFinancePanel ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 items-start">
          <SectionCard
            title="Demandas por quadro"
            icon={Columns3}
            href="/kanban"
            hrefLabel="Ver quadros completos"
            className="md:col-span-2 xl:col-span-1"
            right={
              <span className="text-[28px] font-light tracking-tight leading-none text-ink flex-shrink-0">
                {kanbanTotal}
              </span>
            }
          >
            <KanbanBoardsList boards={visibleBoards} hiddenCount={hiddenBoardsCount} max={maxKanban} />
          </SectionCard>

          <SectionCard title="Projetos por status" icon={FolderKanban}>
            <ProjectStatusChart data={projectsByStatus} />
          </SectionCard>

          <SectionCard title="Clientes por status" icon={Users2}>
            <ClientStatusChart data={clientsByStatus} />
          </SectionCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
          <SectionCard title="Projetos por status" icon={FolderKanban}>
            <ProjectStatusChart data={projectsByStatus} />
          </SectionCard>

          <SectionCard title="Clientes por status" icon={Users2}>
            <ClientStatusChart data={clientsByStatus} />
          </SectionCard>
        </div>
      )}

      {/* Financeiro: saldo, aprovações e resumo em ficha pontilhada */}
      {isAdmin && financials && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6 items-start">
          <SectionCard title="Saldo mensal" icon={TrendingUp} className="md:col-span-2 xl:col-span-1">
            <BalanceChart data={financials.trend} />
          </SectionCard>

          <SectionCard
            title="Status de aprovação"
            icon={ClipboardCheck}
            href="/aprovacoes"
            hrefLabel="Ver aprovações"
          >
            <ApprovalStatusChart data={approvalStatusBreakdown} size={140} />
          </SectionCard>

          <SectionCard title="Resumo financeiro" icon={Wallet2}>
            <div className="flex flex-col gap-5 pt-2 tabular-nums">
              <DottedRow
                label="Faturamento"
                value={
                  <>
                    {compactCurrency(financials.monthIncome)}
                    {trendLabel(financials.incomeTrendPct) && (
                      <span className="ml-2 text-xs font-medium text-success">
                        {trendLabel(financials.incomeTrendPct)}
                      </span>
                    )}
                  </>
                }
              />
              <DottedRow
                label="Despesas"
                value={
                  <>
                    {compactCurrency(financials.monthExpense)}
                    {trendLabel(financials.expenseTrendPct) && (
                      <span className="ml-2 text-xs font-medium text-danger">
                        {trendLabel(financials.expenseTrendPct)}
                      </span>
                    )}
                  </>
                }
              />
              <DottedRow
                label="Saldo"
                value={compactCurrency(financials.monthIncome - financials.monthExpense)}
              />
              <DottedRow
                label="Atrasados"
                value={
                  <span className={financials.overdueCount > 0 ? "text-danger font-semibold" : undefined}>
                    {financials.overdueCount}
                  </span>
                }
              />
            </div>
          </SectionCard>
        </div>
      )}

      {/* Rankings */}
      {isAdmin && financials && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
          <SectionCard title="Top clientes (6 meses)" icon={Trophy}>
            {financials.topClients.length === 0 ? (
              <EmptyHint>Sem faturamento registrado ainda.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-4">
                {financials.topClients.map((c, i) => {
                  const max = financials.topClients[0].amount || 1;
                  return (
                    <RankRow
                      key={i}
                      index={i}
                      name={c.name}
                      amount={c.amount}
                      pct={(c.amount / max) * 100}
                      tone="accent"
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Despesas por equipe (6 meses)" icon={Wallet2}>
            {financials.expensesByCategory.length === 0 ? (
              <EmptyHint>Sem despesas vinculadas à equipe ainda.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-4">
                {financials.expensesByCategory.map((c, i) => {
                  const max = financials.expensesByCategory[0].amount || 1;
                  return (
                    <RankRow
                      key={i}
                      index={i}
                      name={c.name}
                      amount={c.amount}
                      pct={(c.amount / max) * 100}
                      tone="danger"
                    />
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Atividade recente */}
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start",
          hasFinancePanel && "2xl:grid-cols-4",
        )}
      >
        {hasFinancePanel && (
          <SectionCard
            title="Próximos prazos"
            icon={CalendarClock}
            href="/projetos"
            hrefLabel="Ver todos os projetos"
          >
            {deadlinesSummary.length === 0 ? (
              <EmptyHint>Nenhum prazo agendado.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-3">
                {deadlinesSummary.map((d, i) => (
                  <Fragment key={d.id}>
                    {i > 0 && <DottedDivider />}
                    <FeedRow
                      icon={CalendarClock}
                      title={d.name}
                      subtitle={d.clientName}
                      right={`${daysUntil(d.dueDate)}d · ${formatDate(d.dueDate)}`}
                    />
                  </Fragment>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        <SectionCard
          title="Aprovações pendentes"
          icon={ClipboardCheck}
          href="/aprovacoes"
          hrefLabel="Ver todas as aprovações"
          right={
            pendingApprovalsCount > 0 ? (
              <span className="text-[22px] font-light tracking-tight leading-none text-accent flex-shrink-0">
                {pendingApprovalsCount}
              </span>
            ) : undefined
          }
        >
          {approvalsSummary.length === 0 ? (
            <EmptyHint>Nenhum post aguardando aprovação.</EmptyHint>
          ) : (
            <div className="flex flex-col gap-3">
              {approvalsSummary.map((a, i) => (
                <Fragment key={a.id}>
                  {i > 0 && <DottedDivider />}
                  <FeedRow
                    icon={ClipboardCheck}
                    title={a.title}
                    subtitle={a.clientName}
                    right={formatDate(a.createdAt)}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Notas recentes" icon={NotebookText} href="/notas" hrefLabel="Ver todas as notas">
          {notesSummary.length === 0 ? (
            <EmptyHint>Nenhuma nota criada ainda.</EmptyHint>
          ) : (
            <div className="flex flex-col gap-3">
              {notesSummary.map((n, i) => (
                <Fragment key={n.id}>
                  {i > 0 && <DottedDivider />}
                  <FeedRow
                    icon={NotebookText}
                    title={n.title}
                    subtitle={n.label ?? "Sem organização"}
                    right={formatDate(n.updatedAt)}
                  />
                </Fragment>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Checklists recentes"
          icon={ListChecks}
          href="/checklist"
          hrefLabel="Ver todas as checklists"
        >
          {checklistsSummary.length === 0 ? (
            <EmptyHint>Nenhuma checklist criada ainda.</EmptyHint>
          ) : (
            <div className="flex flex-col gap-4">
              {checklistsSummary.map((c) => {
                const pct = c.total > 0 ? (c.done / c.total) * 100 : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium text-ink truncate">{c.title}</span>
                      <span className="text-xs font-semibold text-muted flex-shrink-0 tabular-nums">
                        {c.done}/{c.total}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", pct === 100 ? "bg-success" : "bg-accent")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
