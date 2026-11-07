import Link from "next/link";
import { Trophy, Heart, MessageCircle, Eye } from "lucide-react";
import { requireModulePage } from "@/lib/authz";
import { computeContentRanking } from "@/lib/contentRanking";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { EmptyState } from "@/components/ui/PageHeader";
import { SocialIcon } from "@/components/kanban/SocialIcons";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

const PERIODS = [
  { months: 1, label: "30 dias" },
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
];
const PAGE_SIZE = 25;

type SearchParams = { months?: string; limit?: string };

export default async function RankingConteudoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireModulePage("ferramentas");

  const { months: monthsParam, limit: limitParam } = await searchParams;
  const months = PERIODS.some((p) => p.months === Number(monthsParam)) ? Number(monthsParam) : 1;
  const limit = Math.max(PAGE_SIZE, Number(limitParam) || PAGE_SIZE);

  const ranking = await computeContentRanking(months, limit);
  const hasMore = ranking.length === limit;

  return (
    <div>
      <PageHeader
        title="Ranking de Conteúdo"
        description="Os posts com melhor engajamento no período, entre todos os clientes - pra achar o que funcionou e reaproveitar a ideia."
      />

      <div className="flex gap-1 bg-surface rounded-full p-1 w-fit mb-6 shadow-sm shadow-black/5">
        {PERIODS.map((p) => (
          <Link
            key={p.months}
            href={`/ferramentas/ranking-conteudo?months=${p.months}`}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold transition-colors",
              p.months === months ? "bg-accent text-black" : "text-muted hover:text-ink",
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {ranking.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Trophy size={20} strokeWidth={1.8} />}
            title="Nenhum post com métrica ainda"
            description="Assim que posts publicados tiverem métrica coletada (curtidas, comentários, alcance), o ranking aparece aqui."
          />
        </Card>
      ) : (
        <>
          <Card padding="lg">
            <div className="flex flex-col">
              {ranking.map((item, i) => (
                <div key={item.cardId}>
                  {i > 0 && <DottedDivider />}
                  <div className="flex items-center gap-4 py-4">
                    <span className="w-8 h-8 rounded-full bg-surface-2 text-ink text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <IconChip size="sm">
                      <SocialIcon network={item.network} size={14} />
                    </IconChip>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
                      <p className="text-xs text-muted mt-0.5">{item.clientName} · {formatDate(item.publishedAt)}</p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 text-xs text-muted tabular-nums">
                      {item.reach !== null && (
                        <span className="flex items-center gap-1"><Eye size={12} /> {item.reach.toLocaleString("pt-BR")}</span>
                      )}
                      {item.likes !== null && (
                        <span className="flex items-center gap-1"><Heart size={12} /> {item.likes.toLocaleString("pt-BR")}</span>
                      )}
                      {item.comments !== null && (
                        <span className="flex items-center gap-1"><MessageCircle size={12} /> {item.comments.toLocaleString("pt-BR")}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {hasMore && (
            <div className="flex justify-center mt-5">
              <Link
                href={`/ferramentas/ranking-conteudo?months=${months}&limit=${limit + PAGE_SIZE}`}
                className="text-xs font-semibold px-4 py-2.5 rounded-full bg-surface-2 text-ink hover:bg-panel-2 transition-colors"
              >
                Carregar mais
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
