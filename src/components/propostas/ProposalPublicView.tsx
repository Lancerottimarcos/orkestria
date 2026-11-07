"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, FileText, Calendar, MessageSquareWarning, ArrowRight, QrCode, Barcode, CreditCard, Landmark, PenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { formatCurrency, formatDate } from "@/lib/format";
import { PROPOSAL_STATUS_LABELS } from "@/lib/labels";
import { PAYMENT_METHOD_LABELS, PROPOSAL_KIND_LABELS, type PaymentMethod, type ProposalKind } from "./types";
import { ProposalNarrative, parseProposalDoc } from "./VisualLawProposal";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";

type ProposalItem = { id: string; description: string; scope: string | null; quantity: number; unitValue: number };
type Installment = { id: string; dueDate: string; value: number };

type Proposal = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  status: string;
  kind: ProposalKind;
  proposalBodyJson: string | null;
  proposalVariablesJson: string | null;
  contactName: string | null;
  notes: string | null;
  validUntil: string | null;
  createdAt: string;
  client: { name: string } | null;
  items: ProposalItem[];
  paymentCondition: "CASH" | "INSTALLMENTS";
  setupFee: number | null;
  paymentMethods: PaymentMethod[];
  installments: Installment[];
};

const STATUS_ICON: Record<string, typeof Clock> = {
  DRAFT: Clock,
  SENT: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
  CHANGES_REQUESTED: MessageSquareWarning,
};

const PAYMENT_METHOD_ICON: Record<PaymentMethod, typeof QrCode> = {
  PIX: QrCode,
  BOLETO: Barcode,
  CARD: CreditCard,
  TRANSFER: Landmark,
};

/**
 * Página pública da PROPOSTA (etapa 1 de 2) - só decisão do cliente
 * (aceitar/recusar/pedir alterações). O contrato é outra página
 * (/contrato/[token]) - ao aceitar, o cliente é levado pra lá
 * automaticamente, sem nada de contrato aparecer aqui.
 */
export function ProposalPublicView({ token, initialProposal, initialTheme }: { token: string; initialProposal: Proposal; initialTheme: "dark" | "light" }) {
  const router = useRouter();
  const [proposal, setProposal] = useState(initialProposal);
  const [signerName, setSignerName] = useState("");
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeMessage, setChangeMessage] = useState("");
  const [submitting, setSubmitting] = useState<"accept" | "reject" | "request_changes" | null>(null);

  const viewIdRef = useRef<string | null>(null);
  const maxScrollRef = useRef(0);
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    fetch(`/api/proposta/${token}/visualizacao`, { method: "POST" })
      .then((r) => r.json())
      .then((v) => {
        viewIdRef.current = v?.id ?? null;
      })
      .catch(() => {});

    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const percent = scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 100;
      if (percent > maxScrollRef.current) maxScrollRef.current = percent;
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function sendBeacon() {
      if (!viewIdRef.current || mountedAtRef.current === null) return;
      const durationSeconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
      const payload = JSON.stringify({ durationSeconds, maxScrollPercent: maxScrollRef.current });
      navigator.sendBeacon?.(`/api/proposta/${token}/visualizacao/${viewIdRef.current}`, new Blob([payload], { type: "application/json" }));
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendBeacon();
    });
    window.addEventListener("pagehide", sendBeacon);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", sendBeacon);
    };
  }, [token]);

  const total = proposal.items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
  const StatusIcon = STATUS_ICON[proposal.status] ?? Clock;
  const expired = !!proposal.validUntil && new Date(proposal.validUntil) < new Date();
  const hasPaymentInfo = !!proposal.setupFee || proposal.installments.length > 0 || proposal.paymentMethods.length > 0;
  const kindLabel = PROPOSAL_KIND_LABELS[proposal.kind];

  const parsedNarrative = useMemo(() => {
    if (proposal.kind !== "FULL" || !proposal.proposalBodyJson) return null;
    try {
      const vars = proposal.proposalVariablesJson ? JSON.parse(proposal.proposalVariablesJson) : {};
      return parseProposalDoc(JSON.parse(proposal.proposalBodyJson), vars, "p");
    } catch {
      return null;
    }
  }, [proposal.kind, proposal.proposalBodyJson, proposal.proposalVariablesJson]);
  const narrativeVars = useMemo(() => {
    try {
      return proposal.proposalVariablesJson ? JSON.parse(proposal.proposalVariablesJson) : {};
    } catch {
      return {};
    }
  }, [proposal.proposalVariablesJson]);

  async function handleDecision(action: "accept" | "reject" | "request_changes") {
    setSubmitting(action);
    try {
      const res = await fetch(`/api/proposta/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, signerName, message: changeMessage }),
      });
      if (res.ok) {
        if (action === "accept") {
          // direcionado automaticamente pro contrato - a proposta em si não
          // mostra nada de contrato, é só a decisão
          router.push(`/contrato/${token}`);
          return;
        }
        const data = await res.json();
        setProposal((prev) => ({ ...prev, ...data }));
      }
    } finally {
      setSubmitting(null);
    }
  }

  function paymentSummary() {
    const parts: string[] = [];
    if (proposal.setupFee) parts.push(`Entrada de ${formatCurrency(proposal.setupFee)}`);
    if (proposal.installments.length > 1) {
      parts.push(`${proposal.installments.length}x de ${formatCurrency(proposal.installments[0].value)}`);
    } else if (proposal.paymentCondition === "CASH") {
      parts.push(`${formatCurrency(total - (proposal.setupFee ?? 0))} à vista`);
    }
    return parts.join(" + ") || formatCurrency(total);
  }

  const installmentSummary =
    proposal.installments.length > 1 ? `${proposal.installments.length}x` : "À vista";

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10 sm:px-6 sm:py-16 relative overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.08] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <span className="w-[34px]" />
          <p className="text-xl font-semibold tracking-tight text-ink text-center flex-1">
            Or<span className="text-accent">kestrya</span>
          </p>
          <span className="w-[34px] flex justify-end">
            <ThemeToggle initialTheme={initialTheme} />
          </span>
        </div>

        <Card padding="none" className="overflow-hidden shadow-xl shadow-black/10 animate-fade-slide-up">
          <div className="relative overflow-hidden px-6 sm:px-12 pt-12 sm:pt-16 pb-9 sm:pb-12 bg-panel">
            {proposal.coverImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proposal.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/65" />
              </>
            ) : (
              <>
                <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-accent/20 blur-[110px] pointer-events-none" />
                <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent-light/10 blur-[110px] pointer-events-none" />
              </>
            )}
            <div className="relative flex items-center justify-between gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                <FileText size={12} /> {kindLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white">
                <StatusIcon size={12} className="text-accent" /> {PROPOSAL_STATUS_LABELS[proposal.status]}
              </span>
            </div>
            <h1 className="relative text-[32px] sm:text-[44px] font-light tracking-tight leading-[1.08] text-white mt-6">
              {proposal.title}
            </h1>
            {(proposal.contactName || proposal.client) && (
              <p className="relative text-[15px] text-white/60 mt-3.5">
                Preparada para{" "}
                <span className="text-white font-semibold">{proposal.contactName ?? proposal.client?.name}</span>
              </p>
            )}
            <div className="relative mt-8 pt-5 border-t border-white/10 flex items-center gap-x-6 gap-y-2 flex-wrap text-[11px] font-medium text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} className="text-accent" /> Emitida em {formatDate(proposal.createdAt)}
              </span>
              {proposal.validUntil && (
                <span className={cn("inline-flex items-center gap-1.5", expired && "text-danger")}>
                  <Calendar size={12} className={expired ? "text-danger" : "text-accent"} />
                  {expired ? "Venceu em" : "Válida até"} {formatDate(proposal.validUntil)}
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-8 flex flex-col gap-8 bg-surface-2/30">
            {parsedNarrative && <ProposalNarrative parsed={parsedNarrative} vars={narrativeVars} />}

            <section className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="px-5 sm:px-6 py-5 flex items-end justify-between gap-4 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent">Investimento total</span>
                  <span className="text-[30px] sm:text-[34px] font-light tracking-tight text-ink tabular-nums leading-none">
                    {formatCurrency(total)}
                  </span>
                </div>
                <span className="rounded-xl bg-panel text-panel-ink px-4 py-2.5 flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/60">Condição</span>
                  <span className="text-sm font-semibold leading-tight">{installmentSummary}</span>
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                <div className="px-5 sm:px-6 py-3.5 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Serviços</span>
                  <span className="text-xs font-semibold text-ink">
                    {proposal.items.length} {proposal.items.length === 1 ? "serviço incluído" : "serviços incluídos"}
                  </span>
                </div>
                <div className="px-5 sm:px-6 py-3.5 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Entrada/Setup</span>
                  <span className="text-xs font-semibold text-ink tabular-nums">
                    {proposal.setupFee ? formatCurrency(proposal.setupFee) : "Sem entrada"}
                  </span>
                </div>
              </div>
              {proposal.paymentMethods.length > 0 && (
                <div className="border-t border-border px-5 sm:px-6 py-3.5 flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2 mr-1">Formas de pagamento</span>
                  {proposal.paymentMethods.map((m) => {
                    const MethodIcon = PAYMENT_METHOD_ICON[m];
                    return (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-ink"
                      >
                        <MethodIcon size={11} className="text-accent" /> {PAYMENT_METHOD_LABELS[m]}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div className="px-1 flex items-center gap-4">
                <p className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-ink leading-none whitespace-nowrap">
                  O que está incluído
                </p>
                <span className="flex-1 h-px bg-border-2" />
              </div>
              {proposal.items.length > 1 && (
                <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
                    {proposal.items.map((item, i) => {
                      const share = total > 0 ? (item.quantity * item.unitValue) / total : 0;
                      const opacity = [1, 0.7, 0.5, 0.35, 0.22][i % 5];
                      return (
                        <span
                          key={item.id}
                          className="h-full bg-accent first:rounded-l-full last:rounded-r-full"
                          style={{ width: `${Math.max(share * 100, 1)}%`, opacity }}
                          title={`${item.description} - ${Math.round(share * 100)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {proposal.items.map((item, i) => {
                      const share = total > 0 ? (item.quantity * item.unitValue) / total : 0;
                      const opacity = [1, 0.7, 0.5, 0.35, 0.22][i % 5];
                      return (
                        <span key={item.id} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" style={{ opacity }} />
                          <span className="truncate max-w-[160px]" title={item.description}>{item.description}</span>
                          <span className="font-semibold text-ink tabular-nums">{Math.round(share * 100)}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {proposal.kind === "QUICK" ? (
                <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 flex flex-col gap-3">
                  {proposal.items.map((item, index) => (
                    <div key={item.id} className="flex flex-col gap-1">
                      {index > 0 && <DottedDivider className="mb-2" />}
                      <DottedRow
                        label={item.quantity > 1 ? `${item.description} (${item.quantity}x)` : item.description}
                        value={formatCurrency(item.quantity * item.unitValue)}
                      />
                      {item.scope && (
                        <p className="text-[12px] text-muted-2 pl-1 truncate">{item.scope.split("\n")[0].replace(/^[-•*]\s*/, "").trim()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                proposal.items.map((item, index) => {
                  const scopeLines = (item.scope ?? "")
                    .split("\n")
                    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
                    .filter(Boolean);
                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-border bg-surface p-5 sm:p-6 animate-fade-slide-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <header className="flex items-center gap-3.5 pb-3.5 border-b border-border">
                        <span className="text-[26px] font-extralight text-accent tabular-nums leading-none tracking-tight flex-shrink-0">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="text-[15px] font-bold tracking-tight text-ink leading-snug min-w-0 flex-1 break-words">
                          {item.description}
                        </p>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[18px] font-light tracking-tight text-ink tabular-nums leading-none">
                            {formatCurrency(item.quantity * item.unitValue)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-muted-2 mt-1">
                              {item.quantity} x {formatCurrency(item.unitValue)}
                            </p>
                          )}
                        </div>
                      </header>
                      {scopeLines.length > 1 ? (
                        <ul className="flex flex-col gap-1.5 mt-3.5">
                          {scopeLines.map((line, i) => (
                            <li key={i} className="flex items-start gap-2.5 rounded-lg bg-surface-2/50 px-3 py-2">
                              <span className="mt-[7px] w-1.5 h-1.5 rounded-[3px] bg-accent flex-shrink-0" />
                              <span className="text-[12.5px] leading-[1.7] text-ink/90 min-w-0">{line}</span>
                            </li>
                          ))}
                        </ul>
                      ) : item.scope ? (
                        <p className="text-[13px] text-muted mt-3.5 whitespace-pre-wrap leading-relaxed">{item.scope}</p>
                      ) : null}
                    </article>
                  );
                })
              )}
              <div className="rounded-xl border border-accent/25 bg-accent/[0.05] px-5 py-4 flex items-end justify-between gap-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent mb-1">Investimento total</span>
                <span className="text-[24px] font-semibold tracking-tight text-ink tabular-nums leading-none">
                  {formatCurrency(total)}
                </span>
              </div>
            </section>

            {hasPaymentInfo && proposal.installments.length > 1 && (
              <section className="flex flex-col gap-3">
                <div className="px-1 flex items-center gap-4">
                  <p className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-ink leading-none whitespace-nowrap">
                    Como pagar
                  </p>
                  <span className="flex-1 h-px bg-border-2" />
                </div>
                <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                  <p className="px-5 sm:px-6 py-4 text-[14px] font-medium text-ink">{paymentSummary()}</p>
                  <div className="border-t border-border px-5 sm:px-6 py-4 flex flex-col gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-2">Régua de pagamento</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {proposal.installments.map((inst, i) => (
                        <div key={inst.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/70 px-3 py-2">
                          <span className="text-[10px] font-semibold text-muted flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-accent/15 text-accent flex items-center justify-center text-[9px] font-bold tabular-nums">
                              {i + 1}
                            </span>
                            {formatDate(inst.dueDate)}
                          </span>
                          <span className="text-[11px] font-semibold text-ink tabular-nums">{formatCurrency(inst.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {proposal.notes && (
              <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2 flex items-center gap-1.5 mb-2.5">
                  <FileText size={12} className="text-accent" /> Observações
                </p>
                <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{proposal.notes}</p>
              </section>
            )}

            {proposal.kind === "FULL" ? (
              <section className="flex flex-col gap-3">
                <div className="px-1 flex items-center gap-4">
                  <p className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-ink leading-none whitespace-nowrap">
                    Próximos passos
                  </p>
                  <span className="flex-1 h-px bg-border-2" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { number: "01", icon: CheckCircle2, title: "Aceite a proposta", text: "Leva menos de um minuto, aqui mesmo nesta página." },
                    { number: "02", icon: FileText, title: "Leia o contrato", text: "Todo na tela, em linguagem acessível, sem baixar nada." },
                    { number: "03", icon: PenLine, title: "Assine digital", text: "E sua área de cliente é criada na hora, com tudo pronto." },
                  ].map((step) => (
                    <div key={step.number} className="rounded-2xl border border-border bg-surface p-4 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[24px] font-extralight text-accent tabular-nums leading-none">{step.number}</span>
                        <step.icon size={15} strokeWidth={1.8} className="text-muted-2" />
                      </div>
                      <p className="text-[13px] font-bold text-ink leading-snug">{step.title}</p>
                      <p className="text-[11px] text-muted leading-relaxed">{step.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <p className="text-[13px] text-muted-2 text-center px-1">
                Ao aceitar este orçamento, você poderá conferir e assinar o contrato na etapa seguinte.
              </p>
            )}
          </div>

          <DottedDivider />

          <div className="p-6 sm:px-10 sm:py-8">
            {proposal.status === "ACCEPTED" ? (
              <div className="flex flex-col items-center text-center gap-4 py-2">
                <span className="w-12 h-12 rounded-full flex items-center justify-center bg-success/10 text-success">
                  <CheckCircle2 size={22} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Proposta aceita</p>
                  <p className="text-sm text-muted mt-1">Seu contrato já está pronto pra você conferir e assinar.</p>
                </div>
                <Button type="button" size="lg" onClick={() => router.push(`/contrato/${token}`)}>
                  Ver contrato <ArrowRight size={15} />
                </Button>
              </div>
            ) : proposal.status === "REJECTED" ? (
              <div className="flex items-center justify-center gap-3 py-1">
                <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-danger/10 text-danger">
                  <XCircle size={16} strokeWidth={2} />
                </span>
                <p className="text-sm text-muted">Você recusou esta proposta.</p>
              </div>
            ) : proposal.status === "CHANGES_REQUESTED" ? (
              <div className="flex items-center justify-center gap-3 py-1">
                <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-accent/10 text-accent">
                  <MessageSquareWarning size={16} strokeWidth={2} />
                </span>
                <p className="text-sm text-muted">Pedido de alterações enviado - aguarde o retorno.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="proposal-signer-name" className="text-[11px] font-semibold text-muted-2 pl-1.5">
                    Seu nome, para confirmar a decisão
                  </label>
                  <input
                    id="proposal-signer-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Seu nome"
                    className="bg-surface-2 rounded-full px-5 py-3 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
                  />
                </div>
                {expired && <p className="text-xs text-danger">Esta proposta venceu - fale com a agência pra receber uma nova.</p>}
                {requestingChanges && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="proposal-change-message" className="text-[11px] font-semibold text-muted-2 pl-1.5">
                      O que você gostaria de ajustar
                    </label>
                    <textarea
                      id="proposal-change-message"
                      value={changeMessage}
                      onChange={(e) => setChangeMessage(e.target.value)}
                      placeholder="O que você gostaria de ajustar?"
                      rows={3}
                      className="bg-surface-2 rounded-2xl px-5 py-3 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2 resize-none"
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="flex-1 py-3.5"
                    onClick={() => handleDecision("reject")}
                    disabled={submitting !== null || !signerName.trim()}
                  >
                    {submitting === "reject" ? "Enviando..." : "Recusar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="flex-1 py-3.5"
                    onClick={() => (requestingChanges ? handleDecision("request_changes") : setRequestingChanges(true))}
                    disabled={submitting !== null || !signerName.trim() || (requestingChanges && !changeMessage.trim())}
                  >
                    {submitting === "request_changes" ? "Enviando..." : "Pedir alterações"}
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="flex-1 py-3.5"
                    onClick={() => handleDecision("accept")}
                    disabled={submitting !== null || !signerName.trim() || expired}
                  >
                    {submitting === "accept" ? "Enviando..." : "Aceitar proposta"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
