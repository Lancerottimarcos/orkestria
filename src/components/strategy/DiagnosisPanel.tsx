"use client";

import { useEffect, useState } from "react";
import { Frown, Meh, Smile, AtSign, LayoutGrid, Activity, ClipboardCheck, Stethoscope } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { RATING_LABELS, RATING_COLORS } from "@/lib/labels";
import { SaveBar } from "./SaveBar";

type DiagnosisState = {
  instagramHandle: string;
  audience: string;
  positioning: string;
  contentPillars: string[];
  strengths: string[];
  weaknesses: string[];
  avgLikes: string;
  avgComments: string;
  avgShares: string;
  storyInteraction: string;
  rating: string;
  recommendations: string;
};

const EMPTY: DiagnosisState = {
  instagramHandle: "",
  audience: "",
  positioning: "",
  contentPillars: [],
  strengths: [],
  weaknesses: [],
  avgLikes: "",
  avgComments: "",
  avgShares: "",
  storyInteraction: "",
  rating: "",
  recommendations: "",
};

const RATING_ICONS: Record<string, typeof Frown> = { LOW: Frown, MEDIUM: Meh, HIGH: Smile };

export function DiagnosisPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<DiagnosisState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clientes/${clientId}/diagnostico`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          instagramHandle: data.instagramHandle ?? "",
          audience: data.audience ?? "",
          positioning: data.positioning ?? "",
          contentPillars: data.contentPillars ?? [],
          strengths: data.strengths ?? [],
          weaknesses: data.weaknesses ?? [],
          avgLikes: data.avgLikes != null ? String(data.avgLikes) : "",
          avgComments: data.avgComments != null ? String(data.avgComments) : "",
          avgShares: data.avgShares != null ? String(data.avgShares) : "",
          storyInteraction: data.storyInteraction ?? "",
          rating: data.rating ?? "",
          recommendations: data.recommendations ?? "",
        });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function set<K extends keyof DiagnosisState>(key: K, value: DiagnosisState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${clientId}/diagnostico`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (loading) return <p className="text-sm text-muted">Carregando diagnóstico...</p>;

  return (
    <div className="flex flex-col gap-5">
      <SaveBar
        title="Raio-X do perfil"
        description="Um diagnóstico rápido e direto de como o cliente se comunica hoje no Instagram."
        icon={<Stethoscope size={20} strokeWidth={1.8} />}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <AtSign size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Conta e leitura rápida</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="@ do Instagram">
            <Input value={form.instagramHandle} onChange={(e) => set("instagramHandle", e.target.value)} placeholder="@cliente" />
          </Field>
          <Field label="Público percebido">
            <Input value={form.audience} onChange={(e) => set("audience", e.target.value)} placeholder="Para quem esse perfil fala hoje?" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Posicionamento atual">
              <Input value={form.positioning} onChange={(e) => set("positioning", e.target.value)} placeholder="O que vende, qual a promessa?" />
            </Field>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <LayoutGrid size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Conteúdo hoje</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Pilares de conteúdo" hint="Temas recorrentes">
            <TagInput value={form.contentPillars} onChange={(v) => set("contentPillars", v)} placeholder="Ex: bastidores" tone="accent" />
          </Field>
          <Field label="Pontos fortes">
            <TagInput value={form.strengths} onChange={(v) => set("strengths", v)} placeholder="Ex: boa fotografia" tone="success" />
          </Field>
          <Field label="Pontos fracos">
            <TagInput value={form.weaknesses} onChange={(v) => set("weaknesses", v)} placeholder="Ex: postagem irregular" tone="danger" />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Activity size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Engajamento médio</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-5">
          <Field label="Curtidas">
            <Input type="number" value={form.avgLikes} onChange={(e) => set("avgLikes", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Comentários">
            <Input type="number" value={form.avgComments} onChange={(e) => set("avgComments", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Compartilhamentos">
            <Input type="number" value={form.avgShares} onChange={(e) => set("avgShares", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Interação nos Stories">
            <Input value={form.storyInteraction} onChange={(e) => set("storyInteraction", e.target.value)} placeholder="Baixa / Média / Alta" />
          </Field>
        </div>
        <Field label="Classificação geral">
          <div className="grid grid-cols-3 gap-3">
            {(["LOW", "MEDIUM", "HIGH"] as const).map((r) => {
              const isActive = form.rating === r;
              const Icon = RATING_ICONS[r];
              const color = RATING_COLORS[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => set("rating", isActive ? "" : r)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-3xl px-3 py-4 text-sm font-semibold transition-all cursor-pointer border-2 border-transparent",
                    isActive ? "text-black scale-[1.02] shadow-sm" : "hover:scale-[1.01]",
                  )}
                  style={{
                    background: isActive ? color : `color-mix(in srgb, ${color} 14%, transparent)`,
                    color: isActive ? undefined : color,
                  }}
                >
                  <Icon size={22} strokeWidth={1.8} />
                  {RATING_LABELS[r]}
                </button>
              );
            })}
          </div>
        </Field>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <ClipboardCheck size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Veredito</h3>
        </div>
        <Field label="Recomendações estratégicas">
          <Textarea
            value={form.recommendations}
            onChange={(e) => set("recommendations", e.target.value)}
            placeholder="O que fazer a partir daqui para evoluir esse perfil"
            className="min-h-32"
          />
        </Field>
      </Card>
    </div>
  );
}
