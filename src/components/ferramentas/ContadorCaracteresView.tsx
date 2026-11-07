"use client";

import { useState } from "react";
import { Camera, AtSign, X as XIcon, Briefcase, Share2, PlaySquare, MessageCircle, Type } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Input";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { PillProgress } from "@/components/ui/PillProgress";
import { cn } from "@/lib/cn";

const PLATFORMS = [
  { key: "instagram-legenda", name: "Instagram - Legenda", icon: Camera, limit: 2200 },
  { key: "instagram-bio", name: "Instagram - Bio", icon: AtSign, limit: 150 },
  { key: "x", name: "X (Twitter)", icon: XIcon, limit: 280 },
  { key: "linkedin", name: "LinkedIn - Post", icon: Briefcase, limit: 3000 },
  { key: "facebook", name: "Facebook - Post", icon: Share2, limit: 63206 },
  { key: "tiktok", name: "TikTok - Legenda", icon: MessageCircle, limit: 2200 },
  { key: "threads", name: "Threads", icon: MessageCircle, limit: 500 },
  { key: "youtube-titulo", name: "YouTube - Título", icon: PlaySquare, limit: 100 },
];

function toneFor(pct: number) {
  if (pct > 100) return { pill: "hatch" as const, text: "text-danger" };
  if (pct >= 80) return { pill: "accent" as const, text: "text-accent" };
  return { pill: "dark" as const, text: "text-success" };
}

export function ContadorCaracteresView() {
  const [text, setText] = useState("");
  const length = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div>
      <PageHeader title="Contador de Caracteres" description="Verifique se seu texto cabe nos limites de cada rede social." />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-8 items-stretch">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent">
              <Type size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Seu texto</h2>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole ou digite o texto da sua legenda, post ou bio..."
            className="min-h-48 flex-1"
          />
        </Card>

        <Panel padding="lg" className="flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[44px] font-light leading-none tracking-tight text-panel-ink">{length}</span>
            <span className="text-sm text-panel-muted">caracteres</span>
          </div>
          <div className="border-t border-dotted border-panel-2" />
          <div className="flex flex-col gap-1.5">
            <span className="text-[44px] font-light leading-none tracking-tight text-panel-ink">{words}</span>
            <span className="text-sm text-panel-muted">palavras</span>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const pct = Math.min((length / p.limit) * 100, 100);
          const realPct = (length / p.limit) * 100;
          const tone = toneFor(realPct);
          return (
            <Card key={p.key} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconChip size="sm">
                  <Icon size={15} strokeWidth={2} />
                </IconChip>
                <p className="text-sm font-semibold text-ink">{p.name}</p>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn("text-[28px] font-light leading-none tracking-tight", tone.text)}>
                  {length}
                </span>
                <span className="text-xs text-muted-2">de {p.limit}</span>
              </div>
              <PillProgress value={pct} tone={tone.pill} size="sm" label={`${Math.round(realPct)}%`} />
              {realPct > 100 && (
                <p className="text-xs text-danger">{length - p.limit} caracteres acima do limite</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
