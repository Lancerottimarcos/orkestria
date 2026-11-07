import { redirect } from "next/navigation";
import Link from "next/link";
import { History, User as UserIcon, PlusCircle, Pencil, Trash2, PenTool, Receipt, MailWarning, ThumbsUp, ThumbsDown, MessageSquareWarning, ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { EmptyState } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/format";

const ACTION_META: Record<string, { label: string; icon: typeof PlusCircle }> = {
  create: { label: "Criou", icon: PlusCircle },
  update: { label: "Editou", icon: Pencil },
  delete: { label: "Excluiu", icon: Trash2 },
  sign: { label: "Assinou", icon: PenTool },
  charge: { label: "Gerou cobrança", icon: Receipt },
  email_failed: { label: "Falha no envio de e-mail", icon: MailWarning },
  proposal_accepted: { label: "Proposta aceita", icon: ThumbsUp },
  proposal_rejected: { label: "Proposta recusada", icon: ThumbsDown },
  proposal_changes_requested: { label: "Pediu alterações", icon: MessageSquareWarning },
};

const PAGE_SIZE = 50;

// O resumo diário (src/lib/dailyDigest.ts) grava uma linha por dia só como
// marca de "já rodou hoje" - não é uma ação de agência de verdade, então
// fica de fora da trilha de auditoria pra não expulsar histórico real da
// paginação com uma entrada garantida todo santo dia.
const HIDDEN_ACTIONS = ["daily_digest"];

export default async function AtividadePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const where = { action: { notIn: HIDDEN_ACTIONS } };
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, avatarUrl: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Atividade"
        description="Trilha de auditoria das ações de maior impacto - clientes, financeiro e contratos."
      />

      {logs.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<History size={20} strokeWidth={1.8} />}
            title="Nenhuma atividade registrada ainda"
            description="Ações em clientes, financeiro e contratos aparecerão aqui."
          />
        </Card>
      ) : (
        <Card padding="lg">
          <div className="flex flex-col">
            {logs.map((log, i) => {
              const meta = ACTION_META[log.action] ?? { label: log.action, icon: History };
              return (
                <div key={log.id}>
                  {i > 0 && <DottedDivider />}
                  <div className="flex items-center gap-3 py-3.5">
                    <IconChip size="sm">
                      <meta.icon size={14} strokeWidth={2} />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{log.summary}</p>
                      <p className="text-xs text-muted mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                        <span className="inline-flex items-center gap-1.5">
                          <UserIcon size={11} /> {log.user?.name ?? "Link público / sistema"}
                        </span>
                        · {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
          <p className="text-xs text-muted">
            Página {page} de {totalPages} · {total} registros
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/configuracoes/atividade?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full bg-surface-2 text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-3"}`}
            >
              <ChevronLeft size={13} /> Anterior
            </Link>
            <Link
              href={`/configuracoes/atividade?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full bg-surface-2 text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-surface-3"}`}
            >
              Próxima <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
