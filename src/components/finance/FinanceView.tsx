"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
  CircleDot,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { transactionSchema, type TransactionInput, type TransactionFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card, Panel } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { IconChip } from "@/components/ui/IconChip";
import { ThinProgress } from "@/components/ui/PillProgress";
import { FilterBar, FilterSearch, FilterSelect, FilterTabs, FilterClearButton } from "@/components/ui/FilterBar";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { TRANSACTION_STATUS_LABELS, TRANSACTION_STATUS_TONE, EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/ui/Checkbox";

type TransactionRow = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  dueDate: string;
  paidDate: string | null;
  status: "PENDING" | "PAID" | "OVERDUE" | "CANCELED";
  source: "MANUAL" | "RECURRING" | "CONTRACT";
  category: string | null;
  client: { id: string; name: string } | null;
  service: { id: string; name: string } | null;
  teamMember: { id: string; name: string } | null;
};

type Option = { id: string; name: string };
type TypeTab = "ALL" | "INCOME" | "EXPENSE";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "YYYY-MM-DD" de hoje no fuso local - comparado como string, não como Date. */
function todayLocalISODate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Nada muda o status pra OVERDUE automaticamente no banco - deriva na hora de
 * exibir/filtrar. Compara como string de data (não `new Date(...)`): dueDate
 * chega como ISO UTC (`t.dueDate.toISOString()` no servidor, meia-noite UTC
 * do dia escolhido no input), então comparar os objetos Date diretamente
 * contra "hoje" em horário local marcava todo vencimento de hoje como
 * atrasado o dia inteiro pra fusos negativos (ex: Brasil, UTC-3).
 */
function derivedStatus(t: Pick<TransactionRow, "status" | "dueDate">): TransactionRow["status"] {
  if (t.status === "PENDING" && t.dueDate.slice(0, 10) < todayLocalISODate()) return "OVERDUE";
  return t.status;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return ((current - previous) / previous) * 100;
}

function trendLabel(pct: number | null, invert = false) {
  if (pct === null) return undefined;
  const positive = invert ? pct <= 0 : pct >= 0;
  const arrow = pct >= 0 ? "↑" : "↓";
  return {
    text: `${arrow} ${Math.abs(pct).toFixed(0)}% vs período anterior`,
    tone: (positive ? "positive" : "negative") as "positive" | "negative",
  };
}

function buildComposition(rows: TransactionRow[]) {
  const map = new Map<string, number>();
  rows.forEach((t) => {
    const label = t.client?.name ?? t.teamMember?.name ?? t.service?.name ?? "Outros";
    map.set(label, (map.get(label) ?? 0) + t.amount);
  });
  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

export function FinanceView({
  initialTransactions,
  clients,
  services,
  teamMembers,
}: {
  initialTransactions: TransactionRow[];
  clients: (Option & { avatarUrl: string | null })[];
  services: Option[];
  teamMembers: (Option & { avatarUrl: string | null })[];
}) {
  const router = useRouter();
  const [transactions, setTransactions] = useState(initialTransactions);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [generatingChargeId, setGeneratingChargeId] = useState<string | null>(null);
  const [typeTab, setTypeTab] = useState<TypeTab>("ALL");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [search, setSearch] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues, unknown, TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: "INCOME", status: "PENDING" },
  });
  const watchedFormType = watch("type");

  function openCreate() {
    setEditing(null);
    reset({
      type: "INCOME",
      amount: 0,
      description: "",
      dueDate: toDateInputValue(new Date()),
      paidDate: "",
      status: "PENDING",
      clientId: "",
      serviceId: "",
      teamMemberId: "",
      category: "",
    });
    setModalOpen(true);
  }

  function openEdit(t: TransactionRow) {
    setEditing(t);
    reset({
      type: t.type,
      amount: t.amount,
      description: t.description,
      dueDate: toDateInputValue(t.dueDate),
      paidDate: toDateInputValue(t.paidDate),
      status: t.status,
      clientId: t.client?.id ?? "",
      serviceId: t.service?.id ?? "",
      teamMemberId: t.teamMember?.id ?? "",
      category: (t.category as TransactionFormValues["category"]) ?? "",
    });
    setModalOpen(true);
  }

  async function refresh() {
    const updated = await fetch("/api/financeiro").then((r) => r.json());
    setTransactions(updated);
    router.refresh();
  }

  async function onSubmit(data: TransactionInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/financeiro/${editing.id}` : "/api/financeiro";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar lançamento");
      setModalOpen(false);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t: TransactionRow) {
    if (!(await confirmDialog(`Remover o lançamento "${t.description}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/financeiro/${t.id}`, { method: "DELETE" });
    if (res.ok) await refresh();
  }

  async function markAsPaid(t: TransactionRow) {
    const res = await fetch(`/api/financeiro/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: t.type,
        amount: t.amount,
        description: t.description,
        dueDate: toDateInputValue(t.dueDate),
        paidDate: toDateInputValue(new Date()),
        status: "PAID",
        clientId: t.client?.id ?? "",
        serviceId: t.service?.id ?? "",
        teamMemberId: t.teamMember?.id ?? "",
      }),
    });
    if (res.ok) await refresh();
  }

  async function handleGenerateCharge(t: TransactionRow) {
    setGeneratingChargeId(t.id);
    try {
      const res = await fetch(`/api/financeiro/${t.id}/cobranca`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        await navigator.clipboard.writeText(data.paymentLink).catch(() => {});
        await alertDialog(`Cobrança gerada e link copiado:\n${data.paymentLink}`);
      } else {
        await alertDialog(data?.error || "Não foi possível gerar a cobrança.");
      }
    } finally {
      setGeneratingChargeId(null);
    }
  }

  const selectedMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  function periodFilter(rows: TransactionRow[], monthsAgoOffset: number) {
    const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + monthsAgoOffset, 1);
    const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + monthsAgoOffset + 1, 1);
    return rows.filter((t) => {
      const d = new Date(t.dueDate);
      return d >= start && d < end;
    });
  }

  const inPeriod = useMemo(() => {
    if (showAllPeriods) return transactions;
    return periodFilter(transactions, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, selectedMonth, showAllPeriods]);

  const prevPeriod = useMemo(() => {
    if (showAllPeriods) return [];
    return periodFilter(transactions, -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, selectedMonth, showAllPeriods]);

  const filtered = useMemo(() => {
    return inPeriod
      .filter((t) => typeTab === "ALL" || t.type === typeTab)
      .filter((t) => !statusFilter || derivedStatus(t) === statusFilter)
      .filter((t) => !clientFilter || t.client?.id === clientFilter)
      .filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
  }, [inPeriod, typeTab, statusFilter, clientFilter, search]);

  const summary = useMemo(() => {
    const sum = (rows: TransactionRow[], type: "INCOME" | "EXPENSE") =>
      rows.filter((t) => t.type === type && t.status !== "CANCELED").reduce((s, t) => s + t.amount, 0);
    const income = sum(inPeriod, "INCOME");
    const expense = sum(inPeriod, "EXPENSE");
    const prevIncome = sum(prevPeriod, "INCOME");
    const prevExpense = sum(prevPeriod, "EXPENSE");
    return {
      income,
      expense,
      balance: income - expense,
      incomeTrend: trendLabel(pctChange(income, prevIncome)),
      expenseTrend: trendLabel(pctChange(expense, prevExpense), true),
    };
  }, [inPeriod, prevPeriod]);

  const incomeComposition = useMemo(
    () => buildComposition(inPeriod.filter((t) => t.type === "INCOME" && t.status !== "CANCELED")),
    [inPeriod],
  );
  const expenseComposition = useMemo(
    () => buildComposition(inPeriod.filter((t) => t.type === "EXPENSE" && t.status !== "CANCELED")),
    [inPeriod],
  );

  const tabs: { key: TypeTab; label: string }[] = [
    { key: "ALL", label: "Todos" },
    { key: "INCOME", label: "Entradas" },
    { key: "EXPENSE", label: "Saídas" },
  ];

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Entradas e saídas da agência"
        actions={
          <div className="flex items-center gap-2.5">
            <Link
              href="/financeiro/projecao"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink bg-surface-2 rounded-full px-4 py-2.5 hover:bg-surface-3 transition-colors"
            >
              <TrendingUp size={15} /> Projeção
            </Link>
            <Button size="lg" onClick={openCreate}>
              <Plus size={16} /> Novo lançamento
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((m) => m - 1)}
            disabled={showAllPeriods}
            className="w-11 h-11 rounded-full bg-surface shadow-sm shadow-black/5 flex items-center justify-center flex-shrink-0 text-muted hover:text-accent transition-colors disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <span className="h-11 min-w-44 px-6 rounded-full bg-ink text-bg inline-flex items-center justify-center text-sm font-semibold tabular-nums whitespace-nowrap">
            {showAllPeriods
              ? "Todos os períodos"
              : `${MONTH_NAMES[selectedMonth.getMonth()]} ${selectedMonth.getFullYear()}`}
          </span>
          <button
            onClick={() => setMonthOffset((m) => m + 1)}
            disabled={showAllPeriods}
            className="w-11 h-11 rounded-full bg-surface shadow-sm shadow-black/5 flex items-center justify-center flex-shrink-0 text-muted hover:text-accent transition-colors disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
        {monthOffset !== 0 && !showAllPeriods && (
          <Button size="sm" variant="ghost" onClick={() => setMonthOffset(0)}>
            Mês atual
          </Button>
        )}
        <label className="ml-auto h-11 px-5 rounded-full bg-surface shadow-sm shadow-black/5 flex items-center gap-2.5 text-[13px] font-medium text-muted cursor-pointer">
          <Checkbox checked={showAllPeriods} onChange={(e) => setShowAllPeriods(e.target.checked)} />
          Ver todos os períodos
        </label>
      </div>

      <StatPillRow
        className="mb-8"
        items={[
          {
            label: "A receber",
            tone: "accent",
            weight: summary.income,
            display: (
              <span className="flex items-baseline gap-2 min-w-0">
                {formatCurrency(summary.income)}
                {summary.incomeTrend && (
                  <span className="text-[11px] font-medium opacity-70 hidden xl:inline">
                    {summary.incomeTrend.text}
                  </span>
                )}
              </span>
            ),
          },
          {
            label: "A pagar",
            tone: "dark",
            weight: summary.expense,
            display: (
              <span className="flex items-baseline gap-2 min-w-0">
                {formatCurrency(summary.expense)}
                {summary.expenseTrend && (
                  <span className="text-[11px] font-medium opacity-70 hidden xl:inline">
                    {summary.expenseTrend.text}
                  </span>
                )}
              </span>
            ),
          },
          {
            label: "Saldo",
            tone: "outline",
            weight: Math.abs(summary.balance),
            display: formatCurrency(summary.balance),
          },
        ]}
      />

      {(incomeComposition.length > 0 || expenseComposition.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <Card padding="lg" className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <IconChip tone="accent" size="sm">
                <ArrowUpCircle size={16} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-ink">Composição das entradas</h2>
            </div>
            {incomeComposition.length === 0 ? (
              <p className="text-[13px] text-muted">Sem entradas no período.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {incomeComposition.map((c) => {
                  const max = incomeComposition[0].amount || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-4">
                      <span className="text-[13px] text-muted w-28 truncate flex-shrink-0">{c.name}</span>
                      <ThinProgress value={(c.amount / max) * 100} tone="accent" className="flex-1" />
                      <span className="text-sm font-semibold text-ink w-28 text-right flex-shrink-0 tabular-nums whitespace-nowrap">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Panel padding="lg" className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <IconChip tone="panel" size="sm">
                <ArrowDownCircle size={16} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-panel-ink">Composição das saídas</h2>
            </div>
            {expenseComposition.length === 0 ? (
              <p className="text-[13px] text-panel-muted">Sem saídas no período.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {expenseComposition.map((c) => {
                  const max = expenseComposition[0].amount || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-4">
                      <span className="text-[13px] text-panel-muted w-28 truncate flex-shrink-0">{c.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(c.amount / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-panel-ink w-28 text-right flex-shrink-0 tabular-nums whitespace-nowrap">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      <FilterBar>
        <FilterTabs tabs={tabs} value={typeTab} onChange={setTypeTab} />
        <FilterSearch
          placeholder="Buscar lançamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect icon={Building2} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="max-w-40">
          <option value="">Todo cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={CircleDot} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-40">
          <option value="">Todo status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="OVERDUE">Atrasado</option>
          <option value="CANCELED">Cancelado</option>
        </FilterSelect>
        {(search || clientFilter || statusFilter) && (
          <FilterClearButton
            onClick={() => {
              setSearch("");
              setClientFilter("");
              setStatusFilter("");
            }}
          />
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Wallet size={20} strokeWidth={1.8} />}
            title="Nenhum lançamento encontrado"
            description="Cadastre clientes e funcionários para gerar lançamentos automáticos, ou crie um lançamento manual."
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Descrição</Th>
            <Th>Vínculo</Th>
            <Th>Vencimento</Th>
            <Th>Status</Th>
            <Th className="text-right">Valor</Th>
            <Th className="text-right">Ações</Th>
          </Thead>
          <tbody>
            {filtered.map((t) => (
              <Tr key={t.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <IconChip size="sm" tone={t.type === "INCOME" ? "accent" : "dark"}>
                      {t.type === "INCOME" ? (
                        <ArrowUpCircle size={15} strokeWidth={2} />
                      ) : (
                        <ArrowDownCircle size={15} strokeWidth={2} />
                      )}
                    </IconChip>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{t.description}</p>
                      {t.source === "RECURRING" && (
                        <p className="text-xs text-muted">Recorrente</p>
                      )}
                      {t.source === "CONTRACT" && (
                        <p className="text-xs text-muted">Gerado por contrato</p>
                      )}
                      {t.category && (
                        <p className="text-xs text-muted">{EXPENSE_CATEGORY_LABELS[t.category]}</p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td className="text-muted truncate max-w-40">
                  {t.client?.name || t.teamMember?.name || t.service?.name || "-"}
                </Td>
                <Td className="text-muted tabular-nums whitespace-nowrap">{formatDate(t.dueDate)}</Td>
                <Td>
                  <Badge tone={TRANSACTION_STATUS_TONE[derivedStatus(t)]}>
                    {TRANSACTION_STATUS_LABELS[derivedStatus(t)]}
                  </Badge>
                </Td>
                <Td className={`text-right font-semibold tabular-nums whitespace-nowrap ${t.type === "INCOME" ? "text-success" : "text-danger"}`}>
                  {t.type === "INCOME" ? "+" : "-"} {formatCurrency(t.amount)}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    {t.type === "INCOME" && t.status !== "PAID" && t.status !== "CANCELED" && t.client && (
                      <button
                        onClick={() => handleGenerateCharge(t)}
                        disabled={generatingChargeId === t.id}
                        title="Gerar cobrança (PIX/boleto/cartão)"
                        className="text-muted hover:text-accent p-2 rounded-full hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <QrCode size={15} />
                      </button>
                    )}
                    {t.status !== "PAID" && t.status !== "CANCELED" && (
                      <button
                        onClick={() => markAsPaid(t)}
                        title="Marcar como pago"
                        className="text-muted hover:text-success p-2 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(t)}
                      className="text-muted hover:text-accent p-2 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-muted hover:text-danger p-2 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="lançamento"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <Select {...register("type")}>
                <option value="INCOME">Entrada</option>
                <option value="EXPENSE">Saída</option>
              </Select>
            </Field>
            <Field label="Valor (R$)" error={errors.amount?.message}>
              <Input type="number" step="0.01" min="0" {...register("amount")} />
            </Field>
          </div>

          <Field label="Descrição" error={errors.description?.message}>
            <Input {...register("description")} placeholder="Ex: Mensalidade Loja Aurora" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Vencimento" error={errors.dueDate?.message}>
              <Input type="date" {...register("dueDate")} />
            </Field>
            <Field label="Status">
              <Select {...register("status")}>
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Atrasado</option>
                <option value="CANCELED">Cancelado</option>
              </Select>
            </Field>
          </div>

          <Field label="Data do pagamento (opcional)">
            <Input type="date" {...register("paidDate")} />
          </Field>

          {watchedFormType === "EXPENSE" && (
            <Field label="Categoria">
              <Select {...register("category")}>
                <option value="">Sem categoria</option>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Cliente">
              <Select {...register("clientId")}>
                <option value="">Nenhum</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Serviço">
              <Select {...register("serviceId")}>
                <option value="">Nenhum</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Equipe">
              <Select {...register("teamMemberId")}>
                <option value="">Nenhum</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id} data-avatar-name={m.name} data-avatar-url={m.avatarUrl}>{m.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
