"use client";

import { useRouter } from "next/navigation";
import { Camera, X as XIcon, Briefcase, Share2, MessageCircle, CalendarClock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Select } from "@/components/ui/Input";
import { SOCIAL_NETWORK_LABELS } from "@/lib/socialNetworks";
import type { BestPostTime } from "@/lib/bestPostTimes";

const PLATFORMS = [
  {
    key: "instagram",
    name: "Instagram",
    icon: Camera,
    days: "Terça a sexta",
    hours: "10h-13h e 19h-21h",
    tip: "Stories têm melhor alcance no início da manhã e no fim do dia.",
  },
  {
    key: "tiktok",
    name: "TikTok",
    icon: MessageCircle,
    days: "Terça a quinta",
    hours: "18h-21h",
    tip: "Testar também o horário de manhã cedo (6h-9h) para públicos que assistem antes de sair de casa.",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    icon: Briefcase,
    days: "Terça a quinta",
    hours: "8h-10h e 12h",
    tip: "Evitar fins de semana - o público corporativo interage muito menos.",
  },
  {
    key: "facebook",
    name: "Facebook",
    icon: Share2,
    days: "Quarta a sexta",
    hours: "13h-15h",
    tip: "Vídeos nativos performam melhor que links externos.",
  },
  {
    key: "x",
    name: "X (Twitter)",
    icon: XIcon,
    days: "Segunda a sexta",
    hours: "8h-10h e 18h-19h",
    tip: "Conteúdo em tempo real (notícias, bastidores) funciona melhor durante o dia.",
  },
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function MelhoresHorariosView({
  clients,
  selectedClientId,
  realData,
}: {
  clients: { id: string; name: string; avatarUrl: string | null }[];
  selectedClientId: string;
  realData: BestPostTime[];
}) {
  const router = useRouter();

  return (
    <div>
      <PageHeader
        title="Melhores Horários para Postar"
        description="Escolha um cliente pra ver o horário calculado a partir dos posts e métricas reais dele - sem cliente selecionado, mostra a referência geral de mercado."
      />

      <Card padding="lg" className="mb-6">
        <Field label="Ver dado real de um cliente">
          <Select
            value={selectedClientId}
            onChange={(e) => router.push(e.target.value ? `/ferramentas/horarios?client=${e.target.value}` : "/ferramentas/horarios")}
          >
            <option value="">Referência geral (sem cliente)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </Card>

      {selectedClientId && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <IconChip tone="accent" size="sm">
              <Sparkles size={15} strokeWidth={2} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Calculado com os posts deste cliente</h2>
          </div>
          {realData.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-muted">
                Ainda não há posts publicados suficientes (mínimo 8 por rede) pra calcular um horário real pra esse
                cliente. A referência geral abaixo continua valendo até lá.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {realData.map((r) => (
                <Panel key={r.network} padding="lg" className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <IconChip tone="panel" size="lg">
                      <Sparkles size={18} strokeWidth={1.8} />
                    </IconChip>
                    <p className="text-base font-semibold text-panel-ink">{SOCIAL_NETWORK_LABELS[r.network as keyof typeof SOCIAL_NETWORK_LABELS] ?? r.network}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-panel-muted">
                    <CalendarClock size={14} className="flex-shrink-0" />
                    {r.bestDay}
                  </div>
                  <p className="text-[28px] font-light leading-none tracking-tight text-panel-ink">{pad(r.bestHour)}h</p>
                  {r.confidence === "low" && (
                    <p className="text-[11px] font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-1 w-fit">
                      Baixa confiança - poucos posts nesse horário
                    </p>
                  )}
                  <div className="border-t border-dotted border-panel-2" />
                  <p className="text-xs text-panel-muted">Baseado em {r.sampleSize} post(s) publicado(s) com métrica coletada.</p>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-semibold text-ink">Referência geral de mercado</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.key} padding="lg" className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconChip tone="accent" size="lg">
                  <Icon size={20} strokeWidth={1.8} />
                </IconChip>
                <p className="text-base font-semibold text-ink">{p.name}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock size={14} className="flex-shrink-0" />
                {p.days}
              </div>
              <p className="text-[28px] font-light leading-none tracking-tight text-ink">{p.hours}</p>
              <div className="border-t border-dotted border-border-2" />
              <p className="text-xs text-muted">{p.tip}</p>
            </Card>
          );
        })}
      </div>

      <div className="bg-hatch border border-dotted border-border-2 rounded-card p-5 mt-8">
        <p className="text-xs text-muted">
          Valores de referência baseados em médias gerais de mercado. O horário ideal pode variar de acordo com o
          público de cada cliente - vale sempre confirmar com os dados de Insights da conta.
        </p>
      </div>
    </div>
  );
}
