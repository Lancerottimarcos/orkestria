"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Wand2, Eye } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { CoverUploadField } from "@/components/ui/CoverUploadField";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { formatCurrency, toDateInputValue, PERIOD_LABELS, type ContractedServicePeriod } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  PROPOSAL_KIND_LABELS,
  type Option,
  type OpportunityOption,
  type ProposalItem,
  type ProposalInstallment,
  type ProposalDetail,
  type PaymentMethod,
  type ProposalKind,
} from "./types";

const EMPTY_ITEM: ProposalItem = { description: "", quantity: 1, unitValue: 0, billingType: "MONTHLY" };
const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const PROPOSAL_KIND_KEYS = Object.keys(PROPOSAL_KIND_LABELS) as ProposalKind[];
const PROPOSAL_KIND_HINTS: Record<ProposalKind, string> = {
  QUICK: "Rápido e resumido - itens, valores e condições, sem conteúdo narrativo.",
  FULL: "Robusto e detalhado - ganha um corpo narrativo com modelo próprio.",
};

type ProposalTemplateOption = { id: string; name: string; isDefault: boolean };

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `há ${minutes || 1}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

type ProposalModalProps = {
  open: boolean;
  onClose: () => void;
  proposalId: string | null;
  clients: (Option & { avatarUrl: string | null })[];
  opportunities: OpportunityOption[];
  onSaved: () => void;
};

/** Campos da oportunidade que o contrato usa - a proposta avisa o que falta pro contrato sair 100% preenchido. */
const CONTRACT_DATA_FIELDS: { key: keyof OpportunityOption; label: string }[] = [
  { key: "contactName", label: "nome do contato" },
  { key: "email", label: "email" },
  { key: "phone", label: "telefone" },
  { key: "document", label: "CNPJ/CPF" },
  { key: "address", label: "endereço" },
];

// Wrapper fino: só monta o formulário enquanto o modal está aberto, então
// cada abertura é uma instância nova (estado em branco vem dos useState
// iniciais, sem precisar resetar via efeito quando é uma proposta nova).
export function ProposalModal(props: ProposalModalProps) {
  if (!props.open) return null;
  return <ProposalModalForm key={props.proposalId ?? "new"} {...props} />;
}

function ProposalModalForm({
  open,
  onClose,
  proposalId,
  clients,
  opportunities,
  onSaved,
}: ProposalModalProps) {
  const [title, setTitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState("DRAFT");
  const [kind, setKind] = useState<ProposalKind>("FULL");
  const [proposalTemplateId, setProposalTemplateId] = useState("");
  const [templates, setTemplates] = useState<ProposalTemplateOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [items, setItems] = useState<ProposalItem[]>([{ ...EMPTY_ITEM }]);
  const [changeRequestMessage, setChangeRequestMessage] = useState<string | null>(null);
  const [viewsSummary, setViewsSummary] = useState<{ count: number; lastViewedAt: string | null; maxScrollPercent: number } | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCondition, setPaymentCondition] = useState<"CASH" | "INSTALLMENTS">("CASH");
  const [installmentCount, setInstallmentCount] = useState(2);
  const [setupFee, setSetupFee] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [installments, setInstallments] = useState<ProposalInstallment[]>([]);

  // já nasce carregando quando é edição - a instância é remontada do zero a
  // cada abertura (ver wrapper ProposalModal), então não precisa de um
  // setLoading(true) síncrono no efeito abaixo.
  const [loading, setLoading] = useState(!!proposalId);
  const [submitting, setSubmitting] = useState(false);
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = status === "ACCEPTED" || status === "REJECTED";

  // Busca a lista de modelos de proposta independente do kind (é barato e
  // evita um segundo carregamento quando o usuário troca pra "Proposta
  // comercial" depois de abrir o modal). Numa proposta nova, pré-seleciona o
  // modelo marcado como padrão.
  useEffect(() => {
    if (!open) return;
    fetch("/api/configuracoes/propostas-modelos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ProposalTemplateOption[]) => {
        setTemplates(data);
        if (!proposalId) {
          const defaultTemplate = data.find((t) => t.isDefault) ?? data[0];
          if (defaultTemplate) setProposalTemplateId(defaultTemplate.id);
        }
      });
  }, [open, proposalId]);

  useEffect(() => {
    if (!open || !proposalId) return;
    fetch(`/api/propostas/${proposalId}`)
      .then((r) => r.json())
      .then((data: Omit<ProposalDetail, "paymentMethods"> & { paymentMethods: unknown }) => {
        setTitle(data.title);
        setCoverImageUrl(data.coverImageUrl ?? null);
        setStatus(data.status);
        setKind(data.kind ?? "FULL");
        setProposalTemplateId(data.proposalTemplateId ?? "");
        setClientId(data.clientId ?? "");
        setOpportunityId(data.opportunityId ?? "");
        setContactName(data.contactName ?? "");
        setNotes(data.notes ?? "");
        setValidUntil(data.validUntil ? data.validUntil.slice(0, 10) : "");
        setItems(data.items.length ? data.items : [{ ...EMPTY_ITEM }]);
        setChangeRequestMessage(data.changeRequestMessage ?? null);
        setViewsSummary(data.viewsSummary ?? null);
        setPaymentCondition(data.paymentCondition ?? "CASH");
        setInstallmentCount(data.installmentCount ?? 2);
        setSetupFee(data.setupFee ? String(data.setupFee) : "");
        const methodsRaw = data.paymentMethods;
        setPaymentMethods(typeof methodsRaw === "string" && methodsRaw ? (methodsRaw.split(",") as PaymentMethod[]) : []);
        setInstallments((data.installments ?? []).map((i) => ({ ...i, dueDate: toDateInputValue(i.dueDate) })));
        setPaymentOpen(data.paymentCondition === "INSTALLMENTS" || !!data.setupFee);
      })
      .finally(() => setLoading(false));
  }, [open, proposalId]);

  function updateItem(index: number, patch: Partial<ProposalItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitValue) || 0), 0);

  function togglePaymentMethod(method: PaymentMethod) {
    setPaymentMethods((prev) => (prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]));
  }

  function generateInstallments() {
    const fee = Number(setupFee) || 0;
    const remaining = Math.max(total - fee, 0);
    const count = Math.max(1, installmentCount);
    const base = Math.floor((remaining / count) * 100) / 100;
    const rows: ProposalInstallment[] = Array.from({ length: count }, (_, i) => ({
      dueDate: toDateInputValue(addMonths(new Date(), i)),
      // ajusta a última parcela pra fechar o total certinho, sem sobra de centavos
      value: i === count - 1 ? Math.round((remaining - base * (count - 1)) * 100) / 100 : base,
    }));
    setInstallments(rows);
  }

  function updateInstallment(index: number, patch: Partial<ProposalInstallment>) {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, ...patch } : inst)));
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Informe o título da proposta");
      return;
    }
    const validItems = items.filter((item) => item.description.trim());
    if (validItems.length === 0) {
      setError("Adicione ao menos um item");
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title,
        coverImageUrl: coverImageUrl ?? "",
        status,
        kind,
        proposalTemplateId: kind === "FULL" ? proposalTemplateId : "",
        clientId,
        opportunityId,
        contactName,
        notes,
        validUntil,
        items: validItems,
        paymentCondition,
        installmentCount: paymentCondition === "INSTALLMENTS" ? installmentCount : undefined,
        setupFee: setupFee ? Number(setupFee) : undefined,
        paymentMethods,
        installments: paymentCondition === "INSTALLMENTS" ? installments.filter((i) => i.dueDate && i.value > 0) : [],
      };
      const url = proposalId ? `/api/propostas/${proposalId}` : "/api/propostas";
      const method = proposalId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onSaved();
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error && typeof json.error === "string" ? json.error : "Não foi possível salvar a proposta");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualDecision(action: "accept" | "reject") {
    if (!proposalId) return;
    setDecisionSubmitting(true);
    try {
      const res = await fetch(`/api/propostas/${proposalId}/decisao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onSaved();
      } else {
        setError("Não foi possível registrar a decisão");
      }
    } finally {
      setDecisionSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={proposalId ? "Editar" : "Nova"} titleAccent="proposta" width="lg">
      {loading ? (
        <p className="text-sm text-muted-2 py-8 text-center">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Gestão de redes sociais - Pacote mensal" disabled={locked} />
          </Field>

          <div>
            <p className="text-[13px] font-medium text-muted pl-1.5 mb-2">Tipo de documento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROPOSAL_KIND_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={status !== "DRAFT"}
                  onClick={() => setKind(key)}
                  className={`text-left rounded-2xl border px-4 py-3 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    kind === key ? "border-accent bg-accent/[0.07]" : "border-border bg-surface-2/50 hover:bg-surface-2"
                  }`}
                >
                  <p className={`text-sm font-semibold ${kind === key ? "text-accent" : "text-ink"}`}>{PROPOSAL_KIND_LABELS[key]}</p>
                  <p className="text-xs text-muted mt-0.5">{PROPOSAL_KIND_HINTS[key]}</p>
                </button>
              ))}
            </div>
          </div>

          {kind === "FULL" && (
            <Field label="Modelo de proposta" hint={templates.length === 0 ? "Nenhum modelo criado ainda" : undefined}>
              <div className="flex items-center gap-2">
                <Select value={proposalTemplateId} onChange={(e) => setProposalTemplateId(e.target.value)} disabled={locked} className="flex-1">
                  <option value="">Sem modelo (só o resumo de itens e pagamento)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? " (padrão)" : ""}
                    </option>
                  ))}
                </Select>
                <a
                  href="/configuracoes/propostas"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-accent hover:underline whitespace-nowrap flex-shrink-0"
                >
                  Gerenciar modelos
                </a>
              </div>
            </Field>
          )}

          {!locked && (
            <Field label="Capa" hint="Opcional - aparece no topo da proposta pública">
              <CoverUploadField value={coverImageUrl} onChange={setCoverImageUrl} />
            </Field>
          )}

          {viewsSummary && viewsSummary.count > 0 && (
            <p className="text-xs text-muted-2 flex items-center gap-1.5 -mt-1">
              <Eye size={12} />
              {viewsSummary.count} visualização{viewsSummary.count === 1 ? "" : "ões"}
              {viewsSummary.lastViewedAt && ` · última ${relativeTime(viewsSummary.lastViewedAt)}`}
              {viewsSummary.maxScrollPercent >= 90 && " · leu até o fim"}
            </p>
          )}

          {status === "CHANGES_REQUESTED" && changeRequestMessage && (
            <div className="rounded-2xl bg-warning/10 border border-warning/20 px-4 py-3">
              <p className="text-xs font-semibold text-warning mb-1">O cliente pediu alterações</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{changeRequestMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Status">
              <div className="flex flex-col gap-2">
                {locked || status === "CHANGES_REQUESTED" ? (
                  <div className="flex items-center h-10">
                    <Badge tone={status === "ACCEPTED" ? "success" : status === "REJECTED" ? "danger" : "accent"}>
                      {status === "ACCEPTED" ? "Aceita" : status === "REJECTED" ? "Recusada" : "Pediu alterações"}
                    </Badge>
                  </div>
                ) : (
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="DRAFT">Rascunho</option>
                    <option value="SENT">Enviada</option>
                  </Select>
                )}
                {/* Registro manual (cliente aceitou por telefone etc.) - vale pra
                    qualquer proposta já enviada aguardando decisão, não só a que
                    já voltou como "pediu alterações". */}
                {!locked && proposalId && (status === "SENT" || status === "CHANGES_REQUESTED") && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleManualDecision("accept")}
                      disabled={decisionSubmitting}
                      className="text-[11px] font-semibold text-success hover:underline cursor-pointer"
                    >
                      Registrar aceite manual
                    </button>
                    <span className="text-muted-2">·</span>
                    <button
                      type="button"
                      onClick={() => handleManualDecision("reject")}
                      disabled={decisionSubmitting}
                      className="text-[11px] font-semibold text-danger hover:underline cursor-pointer"
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Válida até" hint="Opcional">
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} disabled={locked} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Cliente" hint="Opcional">
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={locked}>
                <option value="">Sem cliente vinculado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Oportunidade (CRM)" hint="Opcional">
              <Select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)} disabled={locked}>
                <option value="">Sem oportunidade vinculada</option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          {(() => {
            const selected = opportunities.find((o) => o.id === opportunityId);
            if (!selected) return null;
            const missing = CONTRACT_DATA_FIELDS.filter((f) => !selected[f.key]?.toString().trim());
            if (missing.length === 0) return null;
            return (
              <div className="rounded-2xl border border-accent/30 bg-accent/[0.07] px-4 py-3 text-xs text-ink leading-relaxed">
                <span className="font-semibold">Dados do contrato incompletos: </span>
                falta cadastrar {missing.map((f) => f.label).join(", ")} nessa oportunidade no CRM. O contrato é
                preenchido com esses dados automaticamente, complete antes de enviar pra ele sair 100%.
              </div>
            );
          })()}

          <Field label="Pessoa de contato" hint="Opcional">
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nome de quem vai receber a proposta" disabled={locked} />
          </Field>

          <div>
            <p className="text-[13px] font-medium text-muted pl-1.5 mb-2">Itens</p>
            <div className="rounded-card bg-surface-2/50 p-4 sm:p-5">
              <div className="hidden sm:flex items-center gap-2 pb-3 text-xs font-medium text-muted-2">
                <span className="flex-1 pl-5">Serviço</span>
                <span className="w-16 text-center">Qtd</span>
                <span className="w-28 pl-5">Valor unitário</span>
                <span className="w-32 pl-5">Cadência</span>
                <span className="w-9 flex-shrink-0" />
              </div>
              <div className="flex flex-col gap-3">
                {items.map((item, index) => (
                  <div key={index} className="rounded-2xl bg-surface p-3 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                        placeholder="Nome do serviço"
                        className="flex-1 min-w-[140px]"
                        disabled={locked}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        className="w-16 text-center"
                        disabled={locked}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitValue}
                        onChange={(e) => updateItem(index, { unitValue: Number(e.target.value) })}
                        className="w-28"
                        disabled={locked}
                      />
                      <Select
                        value={item.billingType ?? "MONTHLY"}
                        onChange={(e) => updateItem(index, { billingType: e.target.value as ContractedServicePeriod })}
                        className="w-32"
                        disabled={locked}
                      >
                        {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={locked}
                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <Textarea
                      value={item.scope ?? ""}
                      onChange={(e) => updateItem(index, { scope: e.target.value })}
                      placeholder="Escopo detalhado - o que está incluso, entregáveis, condições..."
                      rows={2}
                      className="text-xs"
                      disabled={locked}
                    />
                  </div>
                ))}
              </div>
              {!locked && (
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/15 rounded-full px-4 py-2 cursor-pointer transition-colors"
                >
                  <Plus size={13} /> Adicionar item
                </button>
              )}
            </div>
            <div className="mt-5 px-1.5">
              <DottedRow
                label="Total"
                value={
                  <span className="text-[22px] font-light tracking-tight leading-none tabular-nums">
                    {formatCurrency(total)}
                  </span>
                }
              />
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setPaymentOpen((v) => !v)}
              className="text-[13px] font-medium text-muted pl-1.5 mb-2 hover:text-accent transition-colors cursor-pointer flex items-center gap-1.5"
            >
              Condições de pagamento {paymentOpen ? "▾" : "▸"}
            </button>
            {paymentOpen && (
              <div className="rounded-card bg-surface-2/50 p-4 sm:p-5 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Condição">
                    <Select value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value as "CASH" | "INSTALLMENTS")} disabled={locked}>
                      <option value="CASH">À vista</option>
                      <option value="INSTALLMENTS">Parcelado</option>
                    </Select>
                  </Field>
                  {paymentCondition === "INSTALLMENTS" && (
                    <Field label="Número de parcelas">
                      <Input
                        type="number"
                        min={2}
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(Number(e.target.value))}
                        disabled={locked}
                      />
                    </Field>
                  )}
                  <Field label="Entrada / Setup" hint="Opcional">
                    <Input type="number" min={0} step="0.01" value={setupFee} onChange={(e) => setSetupFee(e.target.value)} disabled={locked} />
                  </Field>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted mb-2">Formas de pagamento aceitas</p>
                  <div className="flex flex-wrap gap-3">
                    {PAYMENT_METHOD_KEYS.map((method) => (
                      <label key={method} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox checked={paymentMethods.includes(method)} onChange={() => togglePaymentMethod(method)} disabled={locked} />
                        <span className="text-xs text-ink">{PAYMENT_METHOD_LABELS[method]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentCondition === "INSTALLMENTS" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted">Parcelas</p>
                      {!locked && (
                        <button
                          type="button"
                          onClick={generateInstallments}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent hover:text-accent-dark cursor-pointer transition-colors"
                        >
                          <Wand2 size={11} /> Gerar automaticamente
                        </button>
                      )}
                    </div>
                    {installments.length === 0 ? (
                      <p className="text-xs text-muted-2">Clique em &quot;Gerar automaticamente&quot; pra dividir o valor em parcelas iguais - depois ajuste o que precisar.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {installments.map((inst, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-6 text-[11px] text-muted-2 tabular-nums">{i + 1}/{installments.length}</span>
                            <Input
                              type="date"
                              value={toDateInputValue(inst.dueDate)}
                              onChange={(e) => updateInstallment(i, { dueDate: e.target.value })}
                              className="flex-1 h-8 text-xs"
                              disabled={locked}
                            />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={inst.value}
                              onChange={(e) => updateInstallment(i, { value: Number(e.target.value) })}
                              className="w-28 h-8 text-xs"
                              disabled={locked}
                            />
                            <button
                              type="button"
                              onClick={() => removeInstallment(i)}
                              disabled={locked}
                              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors disabled:opacity-40"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <Field label="Observações" hint="Opcional, visível na proposta pública">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Escopo, prazo..." disabled={locked} />
          </Field>

          {error && (
            <p className="text-xs font-medium text-danger bg-danger/10 rounded-full px-4 py-2 self-start">
              {error}
            </p>
          )}

          <DottedDivider className="mt-1" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {locked ? "Fechar" : "Cancelar"}
            </Button>
            {!locked && (
              <Button type="button" size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
