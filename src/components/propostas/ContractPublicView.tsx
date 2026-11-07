"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  PenLine,
  KeyRound,
  Copy,
  Check,
  ArrowRight,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { formatDate } from "@/lib/format";
import { Confetti } from "@/components/ui/Confetti";
import { SIGNATURE_FONTS, signatureFontClass } from "@/lib/signatureFonts";
import {
  ContractAssurances,
  ContractParties,
  ContractSummary,
  ContractClauses,
  ContractClosing,
  ContractDocTitle,
  parseContract,
  type ParsedContract,
} from "@/components/contracts/VisualLawContract";
import type { PaymentMethod } from "@/components/propostas/types";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";

type ContractedService = {
  id: string;
  name: string;
  contractUrl: string | null;
  contractName: string | null;
  contractBodyJson: string | null;
  contractVariablesJson: string | null;
  signedAt: string | null;
  signerName: string | null;
  signerFont: string | null;
  agencySignedAt: string | null;
  agencySignerName: string | null;
};

type Proposal = {
  id: string;
  title: string;
  client: { name: string } | null;
  paymentCondition: "CASH" | "INSTALLMENTS";
  setupFee: number | null;
  paymentMethods: PaymentMethod[];
  installments: { id: string; dueDate: string; value: number }[];
  contractedServices: ContractedService[];
};

type PortalAccess = { url: string; email: string; password: string } | null;

type ParsedService = {
  service: ContractedService;
  parsed: ParsedContract | null;
  vars: Record<string, string>;
};

/**
 * Página pública do CONTRATO (etapa 2 de 2) - só existe depois que a
 * proposta foi aceita. O contrato inteiro é lido aqui na página em formato
 * Visual Law (partes em cards, quadro resumo, cláusulas numeradas) e
 * assinado digitalmente na tela, com o cliente escolhendo o estilo da
 * própria assinatura.
 */
export function ContractPublicView({ token, initialProposal, initialTheme }: { token: string; initialProposal: Proposal; initialTheme: "dark" | "light" }) {
  const [proposal, setProposal] = useState(initialProposal);
  const [contractSignerName, setContractSignerName] = useState("");
  const [contractSignerDocument, setContractSignerDocument] = useState("");
  const [signerFont, setSignerFont] = useState<string>(SIGNATURE_FONTS[0].key);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [portalAccess, setPortalAccess] = useState<PortalAccess>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const pendingSignature = proposal.contractedServices.filter((s) => s.contractUrl && !s.signedAt);
  const allSigned = proposal.contractedServices.length > 0 && pendingSignature.length === 0;
  const signedService = proposal.contractedServices.find((s) => s.signedAt) ?? null;

  const parsedServices: ParsedService[] = useMemo(
    () =>
      proposal.contractedServices.map((service, index) => {
        let parsed: ParsedContract | null = null;
        let vars: Record<string, string> = {};
        try {
          if (service.contractVariablesJson) vars = JSON.parse(service.contractVariablesJson);
          if (service.contractBodyJson) parsed = parseContract(JSON.parse(service.contractBodyJson), vars, `c${index}`);
        } catch {
          // sem corpo renderizável, o bloco mostra o aviso abaixo
        }
        return { service, parsed, vars };
      }),
    [proposal.contractedServices],
  );

  const firstWithVars = parsedServices.find((p) => Object.keys(p.vars).length > 0) ?? null;
  // Contrato único: o título do documento sobe pro cabeçalho grande (e a
  // barra de título no meio da página some, sem menu embaixo de menu).
  const heroDocTitle = parsedServices.length === 1 ? (parsedServices[0].parsed?.docTitle ?? null) : null;
  const summaryServices = parsedServices
    .filter((p) => Object.keys(p.vars).length > 0)
    .map((p) => ({
      name: p.vars["servico.nome"] ?? p.service.name,
      valueLabel: p.vars["servico.valor"] ?? "-",
      periodLabel: p.vars["servico.periodo"] ?? "-",
      startLabel: p.vars["servico.data_inicio"] ?? "-",
      renewalLabel: p.vars["servico.data_renovacao"] ?? "-",
    }));

  const clientSignature = signedService?.signerName
    ? { name: signedService.signerName, font: signedService.signerFont, signedAt: signedService.signedAt }
    : null;
  const agencySigned = proposal.contractedServices.find((s) => s.agencySignedAt) ?? null;
  const agencySignature = agencySigned?.agencySignerName
    ? { name: agencySigned.agencySignerName, font: null, signedAt: agencySigned.agencySignedAt }
    : null;

  async function handleSign() {
    setSignError(null);
    if (!contractSignerName.trim() || !contractSignerDocument.trim()) {
      setSignError("Informe seu nome e CPF/CNPJ pra assinar");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch(`/api/proposta/${token}/contrato`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: contractSignerName, signerDocument: contractSignerDocument, signerFont }),
      });
      if (res.ok) {
        const data = await res.json();
        setConfettiTrigger((n) => n + 1);
        setPortalAccess(data.portalAccess ?? null);
        setProposal((prev) => ({ ...prev, ...data }));
      } else {
        setSignError("Não foi possível assinar - tente novamente");
      }
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-10 sm:px-6 sm:py-16 relative overflow-hidden bg-bg">
      <Confetti trigger={confettiTrigger} />
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.08] blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <Link
            href={`/proposta/${token}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors"
          >
            <ArrowLeft size={13} /> Ver proposta
          </Link>
          <div className="text-center flex-1">
            <p className="text-xl font-semibold tracking-tight text-ink">
              Or<span className="text-accent">kestrya</span>
            </p>
          </div>
          <span className="w-[88px] flex justify-end">
            <ThemeToggle initialTheme={initialTheme} />
          </span>
        </div>

        <Card padding="none" className="overflow-hidden shadow-xl shadow-black/10 animate-fade-slide-up">
          <div className="relative overflow-hidden px-6 sm:px-12 pt-12 sm:pt-16 pb-9 sm:pb-12 bg-panel">
            <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-accent/20 blur-[110px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent-light/10 blur-[110px] pointer-events-none" />
            <span className="relative inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <ShieldCheck size={12} /> Contrato digital
            </span>
            <h1 className="relative text-[32px] sm:text-[44px] font-light tracking-tight leading-[1.08] text-white mt-5">
              {heroDocTitle ?? proposal.title}
            </h1>
            {proposal.client && (
              <p className="relative text-[15px] text-white/60 mt-3.5">
                Preparado para <span className="text-white font-semibold">{proposal.client.name}</span>
              </p>
            )}
            <div className="relative mt-8 pt-5 border-t border-white/10 flex items-center gap-x-6 gap-y-2 flex-wrap text-[11px] font-medium text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <FileText size={12} className="text-accent" />
                {proposal.contractedServices.length > 1
                  ? `${proposal.contractedServices.length} contratos anexos`
                  : proposal.title}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PenLine size={12} className="text-accent" /> Leia e assine direto nesta página
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-8 flex flex-col gap-8 bg-surface-2/30">
            {summaryServices.length > 0 && (
              <ContractSummary
                services={summaryServices}
                paymentCondition={proposal.paymentCondition}
                setupFee={proposal.setupFee}
                paymentMethods={proposal.paymentMethods}
                installments={proposal.installments}
              />
            )}

            {parsedServices.map(({ service, parsed, vars }, index) => (
              <div key={service.id} className="flex flex-col gap-3 animate-fade-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
                {proposal.contractedServices.length > 1 && (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                    Anexo {String(index + 1).padStart(2, "0")} · {service.name}
                  </p>
                )}
                {parsed ? (
                  <>
                    {parsed.docTitle && !heroDocTitle && <ContractDocTitle title={parsed.docTitle} />}
                    <ContractClauses parsed={parsed} vars={vars} />
                  </>
                ) : (
                  <p className="text-xs text-muted-2">O texto deste contrato ainda está sendo preparado.</p>
                )}
              </div>
            ))}

            {parsedServices.some((s) => s.parsed) && <ContractClosing />}

            <ContractAssurances />

            {firstWithVars && (
              <ContractParties
                vars={firstWithVars.vars}
                clientSignature={clientSignature}
                agencySignature={agencySignature}
              />
            )}
          </div>

          <DottedDivider />

          <div className="p-6 sm:px-10 sm:py-10">
            {allSigned ? (
              <div className="flex flex-col items-center text-center gap-5 py-2">
                <div className="w-full rounded-2xl border border-dashed border-border-2 bg-surface-2/40 px-5 py-7 flex flex-col items-center gap-2">
                  <p className={cn("text-[34px] text-ink leading-none max-w-full truncate", signatureFontClass(signedService?.signerFont))}>
                    {signedService?.signerName ?? "Assinado"}
                  </p>
                  <p className="text-[11px] text-muted-2">
                    Assinado digitalmente em {formatDate(signedService?.signedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-base font-semibold text-ink flex items-center justify-center gap-2">
                    <PenLine size={15} className="text-success" /> Contrato assinado
                  </p>
                  <p className="text-sm text-muted mt-1">Seu projeto já está sendo preparado.</p>
                </div>

                {portalAccess && (
                  <div className="w-full rounded-2xl bg-accent/[0.06] border border-accent/20 p-5 sm:p-6 flex flex-col gap-4 text-left">
                    <p className="text-sm font-semibold text-ink flex items-center gap-2">
                      <KeyRound size={14} className="text-accent" /> Sua área de cliente está pronta
                    </p>
                    <p className="text-xs text-muted">
                      Acompanhe seus serviços, aprove conteúdos e converse com a equipe - tudo num só lugar.
                    </p>
                    <div className="flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2 bg-surface rounded-xl px-3.5 py-2.5">
                        <span className="text-muted-2">Email</span>
                        <span className="text-ink font-medium">{portalAccess.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-surface rounded-xl px-3.5 py-2.5">
                        <span className="text-muted-2">Senha</span>
                        <span className="flex items-center gap-2">
                          <span className="text-ink font-medium font-mono">{portalAccess.password}</span>
                          <button
                            type="button"
                            aria-label="Copiar senha"
                            onClick={() => {
                              navigator.clipboard.writeText(portalAccess.password);
                              setCopiedPassword(true);
                              setTimeout(() => setCopiedPassword(false), 1500);
                            }}
                            className="text-muted hover:text-accent transition-colors cursor-pointer p-2.5 -m-2.5 rounded-full hover:bg-surface-3"
                          >
                            {copiedPassword ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </div>
                    </div>
                    <a href={portalAccess.url} target="_blank" rel="noreferrer">
                      <Button type="button" className="w-full">
                        Acessar minha área <ArrowRight size={14} />
                      </Button>
                    </a>
                    <p className="text-[11px] text-muted-2 text-center">Guarde essa senha - ela só aparece aqui uma vez.</p>
                  </div>
                )}
              </div>
            ) : pendingSignature.length > 0 ? (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-semibold text-ink">Assinar contrato</p>
                  <p className="text-xs text-muted mt-1">Digite seus dados, escolha o estilo da sua assinatura e assine direto na tela.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contract-signer-name" className="text-[11px] font-semibold text-muted-2 pl-1.5">
                      Nome completo
                    </label>
                    <input
                      id="contract-signer-name"
                      value={contractSignerName}
                      onChange={(e) => setContractSignerName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="bg-surface-2 rounded-full px-5 py-3 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contract-signer-document" className="text-[11px] font-semibold text-muted-2 pl-1.5">
                      CPF ou CNPJ
                    </label>
                    <input
                      id="contract-signer-document"
                      value={contractSignerDocument}
                      onChange={(e) => setContractSignerDocument(e.target.value)}
                      placeholder="CPF ou CNPJ"
                      className="bg-surface-2 rounded-full px-5 py-3 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted mb-2">Estilo da assinatura</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {SIGNATURE_FONTS.map((font) => (
                      <button
                        key={font.key}
                        type="button"
                        onClick={() => setSignerFont(font.key)}
                        className={cn(
                          "rounded-2xl border px-3 py-4 flex flex-col items-center gap-1.5 transition-all cursor-pointer",
                          signerFont === font.key
                            ? "border-accent bg-accent/[0.07] shadow-sm shadow-accent/20"
                            : "border-border bg-surface hover:border-border-2",
                        )}
                      >
                        <span className={cn("text-[20px] leading-none text-ink truncate max-w-full", font.className)}>
                          {contractSignerName.trim() || "Assinatura"}
                        </span>
                        <span className="text-[10px] font-medium text-muted-2">{font.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-border-2 bg-surface-2/40 px-5 py-7 flex flex-col items-center justify-center gap-1.5 min-h-[96px]">
                  {contractSignerName.trim() ? (
                    <>
                      <p className={cn("text-[34px] text-ink leading-none max-w-full truncate", signatureFontClass(signerFont))}>
                        {contractSignerName}
                      </p>
                      <p className="text-[10px] text-muted-2 uppercase tracking-wide">Prévia da sua assinatura</p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-2">Sua assinatura aparece aqui enquanto você digita</p>
                  )}
                </div>

                {signError && <p className="text-xs text-danger">{signError}</p>}
                <Button type="button" variant="success" size="lg" onClick={handleSign} disabled={signing}>
                  {signing ? "Assinando..." : "Assinar contrato"}
                </Button>
                <p className="text-[11px] text-muted-2 text-center">
                  Ao assinar, você confirma que leu e concorda com os termos acima.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-2 text-center">Preparando o contrato - atualize a página em instantes.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
