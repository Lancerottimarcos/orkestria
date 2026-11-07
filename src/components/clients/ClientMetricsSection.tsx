"use client";

import { useEffect, useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { IconChip } from "@/components/ui/IconChip";
import { SocialMetricsView } from "@/components/metrics/SocialMetricsView";
import type { ClientMetrics } from "@/lib/socialMetrics";

export function ClientMetricsSection({ clientId }: { clientId: string }) {
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);

  useEffect(() => {
    fetch(`/api/clientes/${clientId}/metricas`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMetrics(data));
  }, [clientId]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mt-10 mb-4">
        <div className="flex items-center gap-3">
          <IconChip size="sm">
            <BarChart3 size={15} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Métricas</h2>
        </div>
        <a
          href={`/api/clientes/${clientId}/relatorio/pdf`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent bg-surface-2 rounded-full px-3 py-1.5 transition-colors"
        >
          <Download size={12} /> Relatório mensal
        </a>
      </div>
      {metrics ? (
        <SocialMetricsView metrics={metrics} />
      ) : (
        <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
      )}
    </div>
  );
}
