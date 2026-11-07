import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requireModulePage } from "@/lib/authz";
import { computeCashFlowProjection } from "@/lib/cashFlowProjection";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DottedRow, DottedDivider } from "@/components/ui/Dotted";
import { formatCurrency } from "@/lib/format";

export default async function ProjecaoPage() {
  await requireModulePage("financeiro");
  const months = await computeCashFlowProjection(3, 3);

  return (
    <div>
      <Link href="/financeiro" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4">
        <ArrowLeft size={14} /> Voltar para Financeiro
      </Link>

      <PageHeader
        title="Projeção de Caixa"
        description="DRE simplificado dos últimos 3 meses e projeção do mês atual + 2 seguintes, com base nas mensalidades e folha fixa ativas hoje."
        actions={
          <a
            href="/api/financeiro/projecao/pdf"
            className="inline-flex items-center gap-2 text-sm font-semibold text-black bg-accent rounded-full px-5 py-2.5 hover:bg-accent-light transition-colors flex-shrink-0"
          >
            <Download size={15} /> Exportar PDF
          </a>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {months.map((m) => (
          <Card key={m.label} padding="lg" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-ink">{m.label}</p>
              {m.isProjection && (
                <span className="text-[11px] font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-1">Projeção</span>
              )}
            </div>
            <DottedRow label="Receita" value={<span className="tabular-nums text-success">{formatCurrency(m.income)}</span>} />
            <DottedDivider />
            {m.expenseByCategory.length === 0 ? (
              <p className="text-xs text-muted-2">Sem despesa registrada.</p>
            ) : (
              m.expenseByCategory.map((e) => (
                <DottedRow key={e.category} label={e.category} value={<span className="tabular-nums text-muted">{formatCurrency(e.amount)}</span>} />
              ))
            )}
            <DottedDivider />
            <DottedRow
              label="Resultado"
              value={
                <span className={`tabular-nums font-semibold ${m.result >= 0 ? "text-success" : "text-danger"}`}>
                  {formatCurrency(m.result)}
                </span>
              }
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
