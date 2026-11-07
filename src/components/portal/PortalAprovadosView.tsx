"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, ImagePlus, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { DottedDivider } from "@/components/ui/Dotted";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { formatDateTime } from "@/lib/format";

type DemandTypeOption = { id: string; name: string; color: string };
type ApprovedPost = {
  id: string;
  title: string;
  reviewedAt: string;
  demandType: DemandTypeOption | null;
  reviewedByName: string | null;
  cover: { url: string; type: "IMAGE" | "VIDEO" } | null;
};

export function PortalAprovadosView({
  posts,
  demandTypes,
}: {
  posts: ApprovedPost[];
  demandTypes: DemandTypeOption[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (typeFilter && p.demandType?.id !== typeFilter) return false;
      if (query && !p.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [posts, search, typeFilter]);

  const hasFilters = Boolean(search || typeFilter);

  return (
    <div className="flex flex-col gap-5">
      {posts.length > 0 && (
        <FilterBar>
          <FilterSearch
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {demandTypes.length > 0 && (
            <FilterSelect icon={Layers} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-44">
              <option value="">Todo tipo</option>
              {demandTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </FilterSelect>
          )}
          {hasFilters && (
            <FilterClearButton
              onClick={() => {
                setSearch("");
                setTypeFilter("");
              }}
            />
          )}
        </FilterBar>
      )}

      {posts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ImagePlus size={20} />}
            title="Você ainda não aprovou nenhum post."
            description="Quando você aprovar um post, ele aparece aqui com a data e a hora da decisão."
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ImagePlus size={20} />}
            title="Nenhum post encontrado"
            description="Tente ajustar a busca ou o filtro de tipo."
          />
        </Card>
      ) : (
        <Card padding="none" className="px-2 sm:px-3 py-2">
          {filtered.map((post, i) => (
            <div key={post.id}>
              {i > 0 && <DottedDivider className="mx-4" />}
              <Link
                href={`/portal/posts/${post.id}`}
                className="flex items-center gap-4 p-4 rounded-3xl hover:bg-surface-2 transition-colors"
              >
                <div className="w-14 h-14 rounded-2xl bg-surface-2 relative overflow-hidden flex-shrink-0">
                  {post.cover?.type === "VIDEO" ? (
                    <video src={post.cover.url} className="w-full h-full object-cover" muted />
                  ) : post.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover.url} alt={post.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-2">
                      <ImagePlus size={16} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{post.title}</p>
                  <p className="inline-flex items-center gap-1.5 text-xs text-success mt-1">
                    <CheckCircle2 size={12} />
                    {post.reviewedByName ? `Aprovado por ${post.reviewedByName}` : "Aprovado"} em {formatDateTime(post.reviewedAt)}
                  </p>
                </div>
                {post.demandType && (
                  <span
                    className="hidden sm:inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `${post.demandType.color}20`, color: post.demandType.color }}
                  >
                    {post.demandType.name}
                  </span>
                )}
                <ChevronRight size={16} className="text-muted-2 flex-shrink-0" />
              </Link>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
