"use client";

import { useState, type ReactNode } from "react";
import { LayoutDashboard, Compass, Wallet, KeyRound, type LucideIcon } from "lucide-react";
import { ViewTabs } from "@/components/views/ViewTabs";

type TabKey = "geral" | "estrategia" | "financeiro" | "acessos";

/**
 * Quebra a ficha do cliente (antes uma rolagem única com todas as seções
 * empilhadas) em abas, seguindo o mesmo padrão de troca de visão client-side
 * usado no Kanban (ViewTabs, sem reload de página).
 */
export function ClientDetailTabs({
  geral,
  estrategia,
  financeiro,
  acessos,
  showEstrategia,
  showFinanceiro,
  showAcessos,
  pendingCount,
}: {
  geral: ReactNode;
  estrategia: ReactNode;
  financeiro: ReactNode;
  acessos: ReactNode;
  showEstrategia: boolean;
  showFinanceiro: boolean;
  showAcessos: boolean;
  pendingCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("geral");

  const options: { key: TabKey; label: string; icon: LucideIcon }[] = [
    {
      key: "geral",
      label: pendingCount > 0 ? `Visão geral (${pendingCount})` : "Visão geral",
      icon: LayoutDashboard,
    },
  ];
  if (showEstrategia) options.push({ key: "estrategia", label: "Estratégia & Marca", icon: Compass });
  if (showFinanceiro) options.push({ key: "financeiro", label: "Financeiro & Contratos", icon: Wallet });
  if (showAcessos) options.push({ key: "acessos", label: "Acessos", icon: KeyRound });

  const activeTab = options.some((o) => o.key === tab) ? tab : "geral";

  return (
    <div>
      {options.length > 1 && (
        <div className="mb-6 -mx-1 px-1 overflow-x-auto">
          <ViewTabs value={activeTab} onChange={setTab} options={options} />
        </div>
      )}
      {activeTab === "geral" && geral}
      {activeTab === "estrategia" && showEstrategia && estrategia}
      {activeTab === "financeiro" && showFinanceiro && financeiro}
      {activeTab === "acessos" && showAcessos && acessos}
    </div>
  );
}
