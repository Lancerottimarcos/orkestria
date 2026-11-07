import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BigStat } from "@/components/ui/StatPills";
import { PortalAprovadosView } from "@/components/portal/PortalAprovadosView";

export const dynamic = "force-dynamic";

export default async function PortalAprovadosPage() {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");

  const posts = await prisma.post.findMany({
    where: { clientId: session.user.clientId, status: "APPROVED" },
    orderBy: { reviewedAt: "desc" },
    select: {
      id: true,
      title: true,
      reviewedAt: true,
      demandType: { select: { id: true, name: true, color: true } },
      attachments: { orderBy: { position: "asc" }, take: 1, select: { url: true, type: true, reviewedByName: true } },
    },
  });

  const demandTypes = Array.from(
    new Map(posts.filter((p) => p.demandType).map((p) => [p.demandType!.id, p.demandType!])).values(),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13px] font-medium text-muted hover:text-accent shadow-sm shadow-black/5 transition-colors mb-5"
        >
          <ArrowLeft size={14} /> Voltar às aprovações
        </Link>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.05] text-ink">
              Histórico de aprovados
            </h1>
            <p className="text-sm text-muted mt-2">Posts que você aprovou, com a data e a hora da aprovação</p>
          </div>
          {posts.length > 0 && (
            <BigStat
              value={posts.length}
              label={posts.length === 1 ? "post aprovado" : "posts aprovados"}
              icon={<CheckCircle2 size={14} className="text-success" />}
            />
          )}
        </div>
      </div>

      <PortalAprovadosView
        demandTypes={demandTypes}
        posts={posts.map((p) => ({
          id: p.id,
          title: p.title,
          reviewedAt: p.reviewedAt!.toISOString(),
          demandType: p.demandType,
          reviewedByName: p.attachments[0]?.reviewedByName ?? null,
          // Anexo de Post nunca é FILE - só imagem/vídeo (garantido no schema de escrita).
          cover: (p.attachments[0] as { url: string; type: "IMAGE" | "VIDEO" } | undefined) ?? null,
        }))}
      />
    </div>
  );
}
