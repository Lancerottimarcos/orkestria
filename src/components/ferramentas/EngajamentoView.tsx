"use client";

import { useMemo, useState } from "react";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input } from "@/components/ui/Input";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { PillProgress } from "@/components/ui/PillProgress";
import { cn } from "@/lib/cn";

function toneFor(rate: number) {
  if (rate >= 3.5) return { label: "Excelente", text: "text-success" };
  if (rate >= 1) return { label: "Bom", text: "text-accent" };
  return { label: "Baixo", text: "text-danger" };
}

export function EngajamentoView() {
  const [followers, setFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");

  const rate = useMemo(() => {
    const f = Number(followers);
    if (!f || f < 0) return null;
    const interactions = (Number(likes) || 0) + (Number(comments) || 0) + (Number(shares) || 0);
    return (interactions / f) * 100;
  }, [followers, likes, comments, shares]);

  const tone = rate !== null ? toneFor(rate) : null;

  return (
    <div>
      <PageHeader
        title="Calculadora de Engajamento"
        description="Calcule a taxa de engajamento de um post a partir de seguidores e interações."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent">
              <Heart size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Dados do post</h2>
          </div>
          <Field label="Seguidores">
            <Input type="number" min={0} value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Ex: 10000" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Curtidas">
              <Input type="number" min={0} value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Comentários">
              <Input type="number" min={0} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Compart." hint="Opcional">
              <Input type="number" min={0} value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" />
            </Field>
          </div>
        </Card>

        <Panel padding="lg" className="flex flex-col justify-center gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-panel-muted">Taxa de engajamento</span>
            <span className={cn("text-[44px] font-light leading-none tracking-tight", tone ? tone.text : "text-panel-ink")}>
              {rate !== null ? `${rate.toFixed(2)}%` : "-"}
            </span>
            {tone && <span className={cn("text-sm font-semibold", tone.text)}>{tone.label}</span>}
          </div>

          {rate !== null && (
            <PillProgress
              value={Math.min((rate / 5) * 100, 100)}
              label={`${rate.toFixed(2)}%`}
              tone="accent"
            />
          )}

          <div className="border-t border-dotted border-panel-2" />

          <p className="text-xs text-panel-muted">
            Referência: abaixo de 1% é baixo, entre 1% e 3,5% é bom, acima de 3,5% é excelente.
          </p>
        </Panel>
      </div>
    </div>
  );
}
