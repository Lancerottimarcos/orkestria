import { redirect } from "next/navigation";
import { Briefcase, FileText, Download, CalendarClock, RefreshCw, BadgeCheck, PenLine } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/lib/format";
import { signatureFontClass } from "@/lib/signatureFonts";
import { cn } from "@/lib/cn";

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  ONE_TIME: "Único",
};

export default async function PortalServicosPage() {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");
  // Aba exclusiva do login principal do cliente - pessoas adicionais
  // cadastradas (ClientPortalUser) não têm acesso a valores/contrato. O
  // default é true (não false) pra sessões antigas sem esse claim no JWT
  // ainda funcionarem normalmente até re-logarem.
  if (session.user.isClientOwner === false) redirect("/portal");

  const services = await prisma.contractedService.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.05] text-ink">
          Seus serviços
        </h1>
        <p className="text-sm text-muted mt-2">O que está contratado com a agência, valores, vigência e contrato</p>
      </div>

      {services.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Briefcase size={20} />}
            title="Nenhum serviço cadastrado ainda"
            description="Assim que a agência cadastrar o que foi contratado, os detalhes aparecem aqui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {services.map((service) => {
            const renewalSoon =
              service.renewalDate && new Date(service.renewalDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
            return (
              <Card key={service.id} padding="none" className="overflow-hidden flex flex-col">
                <div className="p-5 pb-4 flex flex-col gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink text-sm leading-snug">{service.name}</p>
                    <p className="text-lg font-light tracking-tight text-ink mt-1 tabular-nums">
                      {formatCurrency(service.value)}
                      <span className="text-xs text-muted font-normal ml-1">/ {PERIOD_LABELS[service.period].toLowerCase()}</span>
                    </p>
                  </div>
                  {service.scope && <p className="text-xs text-muted leading-relaxed">{service.scope}</p>}
                </div>

                <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
                  <div className="px-4 py-3 flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                      <CalendarClock size={10} /> Início
                    </span>
                    <span className="text-xs font-semibold text-ink tabular-nums">{formatDate(service.startDate)}</span>
                  </div>
                  <div className={cn("px-4 py-3 flex flex-col gap-1", renewalSoon && "bg-accent/10")}>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", renewalSoon ? "text-accent" : "text-muted-2")}>
                      <RefreshCw size={10} /> Renovação
                    </span>
                    <span className={cn("text-xs font-semibold tabular-nums", renewalSoon ? "text-accent" : "text-ink")}>
                      {service.renewalDate ? formatDate(service.renewalDate) : "-"}
                    </span>
                  </div>
                </div>

                {service.contractUrl && (
                  <div className="mt-auto border-t border-border px-4 py-3 flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-surface-2 flex items-center justify-center text-muted flex-shrink-0">
                      <FileText size={14} strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Contrato</p>
                      <p className="text-xs text-ink truncate">{service.contractName ?? "contrato.pdf"}</p>
                    </div>
                    <a
                      href={service.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline flex-shrink-0"
                    >
                      <Download size={14} /> Baixar
                    </a>
                  </div>
                )}

                {service.signedAt && (
                  <div className={cn("border-t border-border px-4 py-3 flex items-center gap-2.5", service.agencySignedAt ? "bg-success/[0.05]" : "")}>
                    <span
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                        service.agencySignedAt ? "bg-success/15 text-success" : "bg-accent/15 text-accent",
                      )}
                    >
                      {service.agencySignedAt ? <BadgeCheck size={14} strokeWidth={1.8} /> : <PenLine size={14} strokeWidth={1.8} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[11px] font-semibold uppercase tracking-wide", service.agencySignedAt ? "text-success" : "text-accent")}>
                        {service.agencySignedAt ? "Assinado por ambas as partes" : "Sua assinatura registrada"}
                      </p>
                      <p className="text-xs text-muted">em {formatDate(service.signedAt)}</p>
                    </div>
                    {service.signerName && (
                      <p className={cn("text-[20px] text-ink leading-none flex-shrink-0 max-w-[45%] truncate", signatureFontClass(service.signerFont))}>
                        {service.signerName}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
