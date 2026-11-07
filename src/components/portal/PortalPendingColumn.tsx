"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImagePlus, ArrowUpDown } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";

type Priority = "LOW" | "MEDIUM" | "HIGH";
type PendingPost = {
  id: string;
  title: string;
  createdAt: string;
  scheduledDate: string | null;
  priority: Priority;
  createdBy: { name: string; avatarUrl: string | null } | null;
  cover: { url: string; type: "IMAGE" | "VIDEO" } | null;
};

const PRIORITY_WEIGHT: Record<Priority, number> = { HIGH: 2, MEDIUM: 1, LOW: 0 };
const PRIORITY_LABEL: Record<Priority, string> = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
const PRIORITY_DOT: Record<Priority, string> = { HIGH: "bg-danger", MEDIUM: "bg-accent", LOW: "bg-muted-2" };

type SortKey = "priority" | "oldest" | "scheduled";

const SORTERS: Record<SortKey, (a: PendingPost, b: PendingPost) => number> = {
  priority: (a, b) =>
    PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
    (a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity) -
      (b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity),
  oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  scheduled: (a, b) =>
    (a.scheduledDate ? new Date(a.scheduledDate).getTime() : Infinity) -
    (b.scheduledDate ? new Date(b.scheduledDate).getTime() : Infinity),
};

const SORT_LABELS: Record<SortKey, string> = {
  priority: "Prioridade",
  oldest: "Mais antigos primeiro",
  scheduled: "Data de postagem",
};

export function PortalPendingColumn({ posts, empty }: { posts: PendingPost[]; empty: string }) {
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const sorted = useMemo(() => [...posts].sort(SORTERS[sortKey]), [posts, sortKey]);

  return (
    <div className="flex flex-col gap-2.5 flex-1 min-h-0">
      {posts.length > 1 && (
        <div className="flex items-center gap-1.5 px-1">
          <ArrowUpDown size={11} className="text-muted-2 flex-shrink-0" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[11px] font-medium text-muted bg-transparent outline-none cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                Ordenar por: {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex-1 bg-hatch border border-dotted border-border-2 rounded-3xl flex items-center justify-center px-4 py-8 text-center text-xs text-muted">
          {empty}
        </div>
      ) : (
        sorted.map((post) => (
          <Link
            key={post.id}
            href={`/portal/posts/${post.id}`}
            className="flex items-center gap-3 bg-surface-2 rounded-2xl p-2.5 hover:bg-surface-3 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-surface-3 relative overflow-hidden flex-shrink-0">
              {post.cover?.type === "VIDEO" ? (
                <video src={post.cover.url} className="w-full h-full object-cover" muted />
              ) : post.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.cover.url} alt={post.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <ImagePlus size={14} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink line-clamp-2 leading-snug">{post.title}</p>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-2 mt-0.5">
                {post.priority !== "MEDIUM" && (
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[post.priority]}`} title={`Prioridade ${PRIORITY_LABEL[post.priority]}`} />
                )}
                {formatDate(post.createdAt)}
                {post.scheduledDate && ` · vai ao ar em ${formatDate(post.scheduledDate)}`}
              </p>
              {post.createdBy && (
                <p className="flex items-center gap-1.5 text-[11px] text-muted-2 mt-1">
                  <Avatar name={post.createdBy.name} url={post.createdBy.avatarUrl} size={14} className="text-[7px]" />
                  Enviado por {post.createdBy.name}
                </p>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
