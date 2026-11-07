import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, FileText, PenLine, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { resolveVariables } from "@/lib/contracts/variables";
import {
  ContractAssurances,
  ContractParties,
  ContractSummary,
  ContractClauses,
  ContractClosing,
  parseContract,
} from "@/components/contracts/VisualLawContract";

type Params = { params: Promise<{ templateId: string }> };

/**
 * Pré-visualização do modelo: renderiza o contrato exatamente como o
 * cliente vê na página pública (mesmos componentes do layout legal
 * design), com dados de exemplo no lugar das variáveis. Sempre mostra a
 * última versão SALVA do modelo.
 */
export default async function TemplatePreviewPage({ params }: Params) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const { templateId } = await params;
  const [template, company] = await Promise.all([
    prisma.contractTemplate.findUnique({ where: { id: templateId } }),
    prisma.companySettings.findFirst(),
  ]);
  if (!template) notFound();

  const start = new Date();
  const renewal = new Date(start);
  renewal.setFullYear(renewal.getFullYear() + 1);

  const vars = resolveVariables({
    client: {
      name: "Empresa Exemplo Ltda",
      contactName: "Ana Andrade",
      document: "12.345.678/0001-90",
      address: "Av. Paulista, 1000, Bela Vista, São Paulo - SP",
      email: "ana@empresaexemplo.com.br",
      phone: "(11) 99999-0000",
    },
    company: {
      name: company?.name ?? "Sua Agência",
      document: company?.document ?? null,
      address: company?.address ?? null,
      email: company?.email ?? null,
      phone: company?.phone ?? null,
      pixKey: company?.pixKey ?? null,
    },
    service: {
      name: template.name,
      scope: "Escopo de exemplo: entregáveis, formatos e frequência definidos na proposta aceita pelo cliente.",
      value: 2500,
      period: "MONTHLY",
      startDate: start,
      renewalDate: renewal,
    },
  });

  let parsed = null;
  try {
    parsed = parseContract(JSON.parse(template.bodyJson), vars, "pv");
  } catch {
    // corpo inválido - a página mostra o aviso abaixo
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <Link
          href={`/configuracoes/contratos/${template.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={13} /> Voltar pro editor
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/25 px-3 py-1.5 text-[11px] font-semibold text-accent">
          <Eye size={12} /> Pré-visualização com dados de exemplo, é assim que o cliente vê
        </span>
      </div>

      <Card padding="none" className="overflow-hidden shadow-xl shadow-black/10">
        <div className="relative overflow-hidden px-6 sm:px-12 pt-12 sm:pt-16 pb-9 sm:pb-12 bg-panel">
          <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-accent/20 blur-[110px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-accent-light/10 blur-[110px] pointer-events-none" />
          <span className="relative inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
            <ShieldCheck size={12} /> Contrato digital
          </span>
          <h1 className="relative text-[32px] sm:text-[44px] font-light tracking-tight leading-[1.08] text-white mt-5">
            {parsed?.docTitle ?? template.name}
          </h1>
          <p className="relative text-[15px] text-white/60 mt-3.5">
            Preparado para <span className="text-white font-semibold">Empresa Exemplo Ltda</span>
          </p>
          <div className="relative mt-8 pt-5 border-t border-white/10 flex items-center gap-x-6 gap-y-2 flex-wrap text-[11px] font-medium text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} className="text-accent" /> {template.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PenLine size={12} className="text-accent" /> Leia e assine direto nesta página
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8 flex flex-col gap-8 bg-surface-2/30">
          <ContractSummary
            services={[
              {
                name: template.name,
                valueLabel: vars["servico.valor"],
                periodLabel: vars["servico.periodo"],
                startLabel: vars["servico.data_inicio"],
                renewalLabel: vars["servico.data_renovacao"],
              },
            ]}
            paymentCondition="CASH"
            setupFee={null}
            paymentMethods={["PIX", "BOLETO"]}
            installments={[]}
          />

          {parsed ? (
            <ContractClauses parsed={parsed} vars={vars} />
          ) : (
            <p className="text-xs text-muted-2">O corpo deste modelo está vazio ou inválido, edite e salve pra pré-visualizar.</p>
          )}

          {parsed && <ContractClosing />}

          <ContractAssurances />

          <ContractParties vars={vars} clientSignature={null} agencySignature={null} />
        </div>
      </Card>
    </div>
  );
}
