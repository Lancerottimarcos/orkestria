"use client";

import { useMemo, useState } from "react";
import { Clock, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Input";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";

const PACES = [
  { key: "slow", label: "Pausado", wpm: 130 },
  { key: "normal", label: "Normal", wpm: 155 },
  { key: "fast", label: "Acelerado", wpm: 180 },
] as const;

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}min ${seconds}s`;
}

export function RoteiroView() {
  const [text, setText] = useState("");

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const chars = text.length;

  return (
    <div>
      <PageHeader
        title="Tempo de Roteiro"
        description="Cole o texto do roteiro e veja quanto tempo ele leva para ser narrado."
      />

      <Card padding="lg" className="mb-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <IconChip tone="accent">
            <FileText size={18} strokeWidth={1.8} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Roteiro</h2>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole aqui o roteiro do vídeo, reels ou stories..."
          className="min-h-48"
        />
        <DottedDivider />
        <div className="flex items-center gap-8">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-light leading-none tracking-tight text-ink">{words}</span>
            <span className="text-xs text-muted">palavras</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-light leading-none tracking-tight text-ink">{chars}</span>
            <span className="text-xs text-muted">caracteres</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {PACES.map((pace, index) => {
          const seconds = words > 0 ? (words / pace.wpm) * 60 : 0;
          const featured = index === 1;

          if (featured) {
            return (
              <Panel key={pace.key} padding="lg" className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <IconChip tone="panel">
                    <Clock size={17} strokeWidth={1.8} />
                  </IconChip>
                  <div>
                    <p className="text-sm font-semibold text-panel-ink">{pace.label}</p>
                    <p className="text-xs text-panel-muted">{pace.wpm} palavras/min</p>
                  </div>
                </div>
                <p className="text-[40px] font-light leading-none tracking-tight text-panel-ink">
                  {words > 0 ? formatDuration(seconds) : "-"}
                </p>
              </Panel>
            );
          }

          return (
            <Card key={pace.key} padding="lg" className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <IconChip>
                  <Clock size={17} strokeWidth={1.8} />
                </IconChip>
                <div>
                  <p className="text-sm font-semibold text-ink">{pace.label}</p>
                  <p className="text-xs text-muted-2">{pace.wpm} palavras/min</p>
                </div>
              </div>
              <p className="text-[40px] font-light leading-none tracking-tight text-ink">
                {words > 0 ? formatDuration(seconds) : "-"}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
