import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye, FileText, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { resolveProposalVariables } from "@/lib/proposals/variables";
import { ProposalNarrative, parseProposalDoc } from "@/components/propostas/VisualLawProposal";

type Params = { params: Promise<{ templateId: string }> };

/**
 * Pré-visualização do modelo: renderiza o corpo narrativo exatamente como
 * aparece na proposta pública (mesmo componente do layout legal design), com
 * dados de exemplo no lugar das variáveis. Sempre mostra a última versão
 * SALVA do modelo - não inclui itens/pagamento, que são específicos de cada
 * proposta, não do modelo.
 */
export default async function ProposalTemplatePreviewPage({ params }: Params) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/");

  const { templateId } = await params;
  const [template, company] = await Promise.all([
    prisma.proposalTemplate.findUnique({ where: { id: templateId } }),
    prisma.companySettings.findFirst(),
  ]);
  if (!template) notFound();

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 15);

  const vars = resolveProposalVariables({
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
    proposal: {
      title: template.name,
      total: 4500,
      validUntil,
      paymentCondition: "INSTALLMENTS",
      setupFee: 500,
      installmentCount: 3,
    },
  });

  let parsed = null;
  try {
    parsed = parseProposalDoc(JSON.parse(template.bodyJson), vars, "pv");
  } catch {
    // corpo inválido - a página mostra o aviso abaixo
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <Link
          href={`/configuracoes/propostas/${template.id}`}
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
            <FileText size={12} /> Proposta comercial
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
              <PenLine size={12} className="text-accent" /> Aceite direto nesta página
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-8 flex flex-col gap-8 bg-surface-2/30">
          {parsed ? (
            <ProposalNarrative parsed={parsed} vars={vars} />
          ) : (
            <p className="text-xs text-muted-2">O corpo deste modelo está vazio ou inválido, edite e salve pra pré-visualizar.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
