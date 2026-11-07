import type { Metadata } from "next";
import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { IconChip } from "@/components/ui/IconChip";
import { Badge } from "@/components/ui/Badge";
import { DottedRow } from "@/components/ui/Dotted";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Status da solicitação de exclusão — Orkestrya",
  description: "Consulte o status de uma solicitação de exclusão de dados feita pelo Instagram ou Facebook.",
};

export default async function SolicitacaoExclusaoDadosPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const request = await prisma.metaDataDeletionRequest.findUnique({ where: { confirmationCode: code } });

  return (
    <div className="min-h-screen bg-app-glow">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Logo />

        <div className="mt-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
            <Trash2 size={12} strokeWidth={2.2} /> Seus dados
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-light tracking-tight text-ink leading-tight">
            Status da solicitação
          </h1>
        </div>

        <div className="mt-10 bg-surface rounded-card shadow-sm shadow-black/5 p-6 sm:p-10">
          {!request ? (
            <div className="flex flex-col items-center text-center gap-3 py-6">
              <IconChip tone="default" size="lg">
                <Clock size={20} strokeWidth={1.8} />
              </IconChip>
              <p className="text-sm font-semibold text-ink">Código não encontrado</p>
              <p className="text-sm text-muted max-w-sm">
                Não encontramos nenhuma solicitação com o código{" "}
                <span className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded">{code}</span>. Confira se o
                link está completo, exatamente como a Meta te enviou.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <IconChip tone="accent" size="lg">
                  <CheckCircle2 size={20} strokeWidth={2} />
                </IconChip>
                <div>
                  <p className="text-base font-semibold text-ink">Exclusão concluída</p>
                  <p className="text-sm text-muted">
                    Os dados ligados a essa conexão foram removidos do Orkestrya.
                  </p>
                </div>
                <Badge tone="success" className="ml-auto">Concluído</Badge>
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <DottedRow label="Código de confirmação" value={<span className="font-mono text-xs">{request.confirmationCode}</span>} />
                <DottedRow label="Contas removidas" value={request.accountsRemoved} />
                <DottedRow label="Solicitado em" value={formatDateTime(request.requestedAt)} />
                <DottedRow label="Concluído em" value={formatDateTime(request.completedAt)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
