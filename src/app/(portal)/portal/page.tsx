import Link from "next/link";
import { Clock, MessageSquareWarning, XCircle, CheckCircle2, ImagePlus, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { DottedDivider } from "@/components/ui/Dotted";
import { PortalPendingColumn } from "@/components/portal/PortalPendingColumn";

const COLUMNS = [
  {
    status: "PENDING" as const,
    title: "Aguardando Aprovação",
    icon: Clock,
    iconClass: "text-muted",
    empty: "Nenhum post aguardando aprovação.",
  },
  {
    status: "CHANGES_REQUESTED" as const,
    title: "Em Alteração",
    icon: MessageSquareWarning,
    iconClass: "text-danger",
    empty: "Nenhum post em alteração.",
  },
  {
    status: "REJECTED" as const,
    title: "Reprovados",
    icon: XCircle,
    iconClass: "text-danger",
    empty: "Nenhum post reprovado.",
  },
];

export default async function PortalHomePage() {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");

  const posts = await prisma.post.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      scheduledDate: true,
      createdBy: { select: { name: true, avatarUrl: true } },
      attachments: { orderBy: { position: "asc" }, take: 1, select: { url: true, type: true } },
    },
  });

  const approvedCount = posts.filter((p) => p.status === "APPROVED").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.05] text-ink">
            Suas aprovações
          </h1>
          <p className="text-sm text-muted mt-2">Acompanhe os posts enviados para sua análise</p>
        </div>

        <Link
          href="/portal/aprovados"
          className="group inline-flex items-center gap-3 rounded-full bg-surface pl-1.5 pr-4 py-1.5 shadow-sm shadow-black/5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
        >
          <span className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={15} />
          </span>
          <span className="text-left min-w-0">
            <span className="block text-[13px] font-semibold text-ink leading-none">Aprovados</span>
            <span className="block text-[11px] text-muted mt-1">{approvedCount} no histórico</span>
          </span>
          <ArrowRight size={14} className="text-muted-2 group-hover:text-accent transition-colors flex-shrink-0" />
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {COLUMNS.map((column) => {
          const items = posts.filter((p) => p.status === column.status);
          return (
            <Card key={column.status} padding="none" className="flex flex-col">
              <div className="flex items-center gap-2.5 px-5 pt-4 pb-3.5">
                <column.icon size={15} className={`${column.iconClass} flex-shrink-0`} />
                <h2 className="text-base font-semibold text-ink truncate">{column.title}</h2>
                <span className="ml-auto text-[13px] font-medium text-muted tabular-nums flex-shrink-0">
                  {items.length}
                </span>
              </div>
              <DottedDivider className="mx-5" />

              <div className="flex flex-col gap-2.5 p-3.5 flex-1">
                {column.status === "PENDING" ? (
                  <PortalPendingColumn
                    empty={column.empty}
                    posts={items.map((post) => ({
                      id: post.id,
                      title: post.title,
                      createdAt: post.createdAt.toISOString(),
                      scheduledDate: post.scheduledDate ? post.scheduledDate.toISOString() : null,
                      priority: post.priority,
                      createdBy: post.createdBy,
                      // Anexo de Post nunca é FILE - só imagem/vídeo (garantido no schema de escrita).
                      cover: (post.attachments[0] as { url: string; type: "IMAGE" | "VIDEO" } | undefined) ?? null,
                    }))}
                  />
                ) : items.length === 0 ? (
                  <div className="flex-1 bg-hatch border border-dotted border-border-2 rounded-3xl flex items-center justify-center px-4 py-8 text-center text-xs text-muted">
                    {column.empty}
                  </div>
                ) : (
                  items.map((post) => {
                    const cover = post.attachments[0];
                    return (
                      <Link
                        key={post.id}
                        href={`/portal/posts/${post.id}`}
                        className="flex items-center gap-3 bg-surface-2 rounded-2xl p-2.5 hover:bg-surface-3 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-surface-3 relative overflow-hidden flex-shrink-0">
                          {cover?.type === "VIDEO" ? (
                            <video src={cover.url} className="w-full h-full object-cover" muted />
                          ) : cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover.url} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted">
                              <ImagePlus size={14} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-ink line-clamp-2 leading-snug">{post.title}</p>
                          <p className="text-[11px] text-muted-2 mt-0.5">{formatDate(post.createdAt.toISOString())}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {posts.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={<ImagePlus size={20} />}
            title="Nenhum post enviado para aprovação ainda."
            description="Assim que a agência enviar um post para sua análise, ele aparece aqui."
          />
        </Card>
      )}
    </div>
  );
}
