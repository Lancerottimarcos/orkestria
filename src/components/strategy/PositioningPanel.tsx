"use client";

import { useEffect, useState } from "react";
import { Check, Fingerprint, Compass, Drama, Sparkles, MessagesSquare, Palette, Images } from "lucide-react";
import { cn } from "@/lib/cn";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { ARCHETYPES } from "@/lib/archetypes";
import { SaveBar } from "./SaveBar";
import { ImageBoard, type BoardImage } from "./ImageBoard";

type PositioningState = {
  photoUrl: string;
  niche: string;
  archetypePrimary: string;
  archetypeSecondary: string;
  essence: string;
  personalityTraits: string[];
  communicationStyle: string[];
  toneOfVoice: string[];
  toneExample: string;
  colorPalette: string;
  typography: string;
  visualStyle: string;
};

const EMPTY: PositioningState = {
  photoUrl: "",
  niche: "",
  archetypePrimary: "",
  archetypeSecondary: "",
  essence: "",
  personalityTraits: [],
  communicationStyle: [],
  toneOfVoice: [],
  toneExample: "",
  colorPalette: "",
  typography: "",
  visualStyle: "",
};

export function PositioningPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PositioningState>(EMPTY);
  const [images, setImages] = useState<BoardImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clientes/${clientId}/posicionamento`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          photoUrl: data.photoUrl ?? "",
          niche: data.niche ?? "",
          archetypePrimary: data.archetypePrimary ?? "",
          archetypeSecondary: data.archetypeSecondary ?? "",
          essence: data.essence ?? "",
          personalityTraits: data.personalityTraits ?? [],
          communicationStyle: data.communicationStyle ?? [],
          toneOfVoice: data.toneOfVoice ?? [],
          toneExample: data.toneExample ?? "",
          colorPalette: data.colorPalette ?? "",
          typography: data.typography ?? "",
          visualStyle: data.visualStyle ?? "",
        });
        setImages(data.images ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function handleAddImages(dataUrls: string[]) {
    for (const dataUrl of dataUrls) {
      const res = await fetch(`/api/clientes/${clientId}/posicionamento/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dataUrl }),
      });
      if (res.ok) {
        const image = await res.json();
        setImages((imgs) => [...imgs, image]);
      }
    }
  }

  async function handleDeleteImage(imageId: string) {
    setImages((imgs) => imgs.filter((i) => i.id !== imageId));
    await fetch(`/api/clientes/${clientId}/posicionamento/images/${imageId}`, { method: "DELETE" });
  }

  function set<K extends keyof PositioningState>(key: K, value: PositioningState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${clientId}/posicionamento`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (loading) return <p className="text-sm text-muted">Carregando posicionamento...</p>;

  return (
    <div className="flex flex-col gap-5">
      <SaveBar
        title="Posicionamento de marca"
        description="Voz, tom e personalidade que a marca ou imagem pessoal deve transmitir."
        icon={<Compass size={20} strokeWidth={1.8} />}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Fingerprint size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Identidade</h3>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <AvatarUploadField name="Cliente" value={form.photoUrl || null} onChange={(v) => set("photoUrl", v ?? "")} />
          <div className="flex-1 min-w-48">
            <Field label="Nicho / mercado">
              <Input value={form.niche} onChange={(e) => set("niche", e.target.value)} placeholder="Ex: finanças pessoais" />
            </Field>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Drama size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Arquétipo principal</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3">
          {ARCHETYPES.map((a) => {
            const isActive = form.archetypePrimary === a.key;
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => set("archetypePrimary", isActive ? "" : a.key)}
                className={cn(
                  "text-left rounded-2xl px-3.5 py-3 border transition-colors cursor-pointer",
                  isActive ? "border-transparent" : "bg-surface-2 border-border hover:border-border-2",
                )}
                style={isActive ? { backgroundColor: `${a.color}22`, borderColor: a.color } : undefined}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}22`, color: a.color }}
                  >
                    <Icon size={13} />
                  </span>
                  <span className="text-xs font-semibold text-ink flex-1 min-w-0 truncate">{a.label}</span>
                  {isActive && (
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                      style={{ background: a.color }}
                    >
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="block text-[11px] text-muted mt-1">{a.desc}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 max-w-xs">
          <Field label="Arquétipo secundário (opcional)">
            <Select value={form.archetypeSecondary} onChange={(e) => set("archetypeSecondary", e.target.value)}>
              <option value="">Nenhum</option>
              {ARCHETYPES.filter((a) => a.key !== form.archetypePrimary).map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Sparkles size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Essência da marca</h3>
        </div>
        <div className="rounded-3xl bg-accent/10 px-6 py-5">
          <Input
            value={form.essence}
            onChange={(e) => set("essence", e.target.value)}
            placeholder="Ex: clareza"
            className="!bg-transparent !border-none !shadow-none text-[26px] font-light tracking-tight text-ink px-0 focus:!ring-0"
          />
          <p className="text-xs text-muted mt-1">Uma palavra ou frase curta que resume tudo</p>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <MessagesSquare size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Voz e comunicação</h3>
        </div>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Traços de personalidade">
              <TagInput value={form.personalityTraits} onChange={(v) => set("personalityTraits", v)} placeholder="Ex: acolhedora" tone="accent" />
            </Field>
            <Field label="Como se comunica">
              <TagInput value={form.communicationStyle} onChange={(v) => set("communicationStyle", v)} placeholder="Ex: usa storytelling" tone="accent" />
            </Field>
          </div>

          <Field label="Tom de voz">
            <TagInput value={form.toneOfVoice} onChange={(v) => set("toneOfVoice", v)} placeholder="Ex: provocador, inspirador" tone="success" />
          </Field>
          <Field label="Exemplo do tom em uso">
            <Textarea value={form.toneExample} onChange={(e) => set("toneExample", e.target.value)} placeholder="Como esse tom aparece em legendas ou stories" />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Palette size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Expressão visual</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Paleta de cores">
            <Input value={form.colorPalette} onChange={(e) => set("colorPalette", e.target.value)} placeholder="Preto, branco, laranja" />
          </Field>
          <Field label="Tipografia">
            <Input value={form.typography} onChange={(e) => set("typography", e.target.value)} placeholder="Inter, Manrope" />
          </Field>
          <Field label="Estilo de imagem">
            <Input value={form.visualStyle} onChange={(e) => set("visualStyle", e.target.value)} placeholder="Editorial, minimalista..." />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Images size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Referências visuais</h3>
        </div>
        <ImageBoard
          label="Novo estilo visual"
          images={images}
          onAdd={handleAddImages}
          onDelete={handleDeleteImage}
          emptyHint="Nenhuma referência visual ainda."
        />
      </Card>
    </div>
  );
}
