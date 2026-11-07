import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientMetrics } from "@/lib/socialMetrics";
import { SocialMetricsView } from "@/components/metrics/SocialMetricsView";

export default async function PortalMetricasPage() {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");

  const metrics = await getClientMetrics(prisma, session.user.clientId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.05] text-ink">Métricas</h1>
          <p className="text-sm text-muted mt-2">Desempenho das suas redes sociais</p>
        </div>
        <a
          href="/api/portal/relatorio/pdf"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-accent rounded-full px-5 py-3 hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Download size={15} /> Baixar relatório
        </a>
      </div>

      <SocialMetricsView metrics={metrics} />
    </div>
  );
}
