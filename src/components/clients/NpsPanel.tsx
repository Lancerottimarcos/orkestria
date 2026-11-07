"use client";

import { useState } from "react";
import { Smile, Link2, Check, MessageCircleHeart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Button } from "@/components/ui/Button";
import { copyToClipboard } from "@/lib/clipboard";
import { formatDate } from "@/lib/format";

export function NpsPanel({
  clientId,
  initialSummary,
}: {
  clientId: string;
  initialSummary: { average: number | null; responseCount: number; trend: { date: string; score: number }[] };
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleShareLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/nps`, { method: "POST" });
      if (res.ok) {
        const { token } = await res.json();
        copyToClipboard(`${window.location.origin}/formulario/${token}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <IconChip tone="accent" size="sm">
          <Smile size={15} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Satisfação do cliente</h2>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          {summary.average !== null ? (
            <>
              <p className="text-3xl font-light tracking-tight text-ink tabular-nums">{summary.average.toFixed(1)} / 5</p>
              <p className="text-xs text-muted mt-1">
                {summary.responseCount} resposta{summary.responseCount === 1 ? "" : "s"}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Ainda sem respostas.</p>
          )}
        </div>
        <Button variant="ghost" onClick={handleShareLink} disabled={loading}>
          {copied ? <Check size={15} /> : <Link2 size={15} />}
          {copied ? "Link copiado" : "Copiar link da pesquisa"}
        </Button>
      </div>

      {summary.trend.length > 0 && (
        <div className="flex flex-col gap-2 mt-5 pt-4 border-t border-dotted border-border-2">
          {summary.trend.slice(-5).reverse().map((t, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <MessageCircleHeart size={12} /> {formatDate(t.date)}
              </span>
              <span className="font-semibold text-ink tabular-nums">{t.score}/5</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
