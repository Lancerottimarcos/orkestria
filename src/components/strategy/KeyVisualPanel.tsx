"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Palette, Type, LayoutTemplate, Images, Frame, GalleryThumbnails, ListChecks } from "lucide-react";
import { LogoUploadField } from "@/components/ui/LogoUploadField";
import { ColorSwatchInput } from "@/components/ui/ColorSwatchInput";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { SaveBar } from "./SaveBar";
import { ImageBoard, type BoardImage } from "./ImageBoard";

type KeyVisualState = {
  logoUrl: string;
  colors: string[];
  primaryFont: string;
  secondaryFont: string;
  layoutNotes: string;
  guidelines: string;
  doNotes: string;
  dontNotes: string;
};

const EMPTY: KeyVisualState = {
  logoUrl: "",
  colors: [],
  primaryFont: "",
  secondaryFont: "",
  layoutNotes: "",
  guidelines: "",
  doNotes: "",
  dontNotes: "",
};

export function KeyVisualPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<KeyVisualState>(EMPTY);
  const [images, setImages] = useState<BoardImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clientes/${clientId}/key-visual`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          logoUrl: data.logoUrl ?? "",
          colors: data.colors ?? [],
          primaryFont: data.primaryFont ?? "",
          secondaryFont: data.secondaryFont ?? "",
          layoutNotes: data.layoutNotes ?? "",
          guidelines: data.guidelines ?? "",
          doNotes: data.doNotes ?? "",
          dontNotes: data.dontNotes ?? "",
        });
        setImages(data.images ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function set<K extends keyof KeyVisualState>(key: K, value: KeyVisualState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${clientId}/key-visual`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  function handleAddImages(category: "reference" | "application") {
    return async (dataUrls: string[]) => {
      for (const dataUrl of dataUrls) {
        const res = await fetch(`/api/clientes/${clientId}/key-visual/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: dataUrl, category }),
        });
        if (res.ok) {
          const image = await res.json();
          setImages((imgs) => [...imgs, image]);
        }
      }
    };
  }

  async function handleDeleteImage(imageId: string) {
    setImages((imgs) => imgs.filter((i) => i.id !== imageId));
    await fetch(`/api/clientes/${clientId}/key-visual/images/${imageId}`, { method: "DELETE" });
  }

  const referenceImages = useMemo(
    () => images.filter((i) => (i.category ?? "reference") === "reference"),
    [images],
  );
  const applicationImages = useMemo(() => images.filter((i) => i.category === "application"), [images]);

  if (loading) return <p className="text-sm text-muted">Carregando key visual...</p>;

  return (
    <div className="flex flex-col gap-5">
      <SaveBar
        title="Key Visual"
        description="O padrão visual de referência para toda peça gráfica deste cliente."
        icon={<Frame size={20} strokeWidth={1.8} />}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      {(form.logoUrl || form.colors.length > 0 || form.primaryFont) && (
        <Panel padding="md" className="flex items-center gap-5 flex-wrap">
          {form.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="Logo" className="w-12 h-12 rounded-2xl object-contain bg-panel-2 p-1.5 flex-shrink-0" />
          )}
          {form.colors.length > 0 && (
            <div className="flex -space-x-1.5">
              {form.colors.slice(0, 6).map((c, i) => (
                <span key={i} className="w-7 h-7 rounded-full ring-2 ring-panel" style={{ background: c }} />
              ))}
            </div>
          )}
          {(form.primaryFont || form.secondaryFont) && (
            <p className="text-xs text-panel-muted">
              {form.primaryFont && <span style={{ fontFamily: form.primaryFont }}>{form.primaryFont}</span>}
              {form.primaryFont && form.secondaryFont && " · "}
              {form.secondaryFont && <span style={{ fontFamily: form.secondaryFont }}>{form.secondaryFont}</span>}
            </p>
          )}
          <span className="text-[13px] font-medium text-panel-muted ml-auto">Prévia da marca</span>
        </Panel>
      )}

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <ImageIcon size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Logo</h3>
        </div>
        <LogoUploadField value={form.logoUrl || null} onChange={(v) => set("logoUrl", v ?? "")} />
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Palette size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Paleta de cores</h3>
        </div>
        <ColorSwatchInput value={form.colors} onChange={(v) => set("colors", v)} />
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Type size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Tipografia</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Fonte principal" hint="Títulos e destaques">
            <Input
              value={form.primaryFont}
              onChange={(e) => set("primaryFont", e.target.value)}
              placeholder="Ex: Poppins Bold"
              style={form.primaryFont ? { fontFamily: form.primaryFont } : undefined}
            />
          </Field>
          <Field label="Fonte secundária" hint="Corpo de texto e legendas">
            <Input
              value={form.secondaryFont}
              onChange={(e) => set("secondaryFont", e.target.value)}
              placeholder="Ex: Inter Regular"
              style={form.secondaryFont ? { fontFamily: form.secondaryFont } : undefined}
            />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <LayoutTemplate size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Composição</h3>
        </div>
        <div className="flex flex-col gap-5">
          <Field label="Grid e diagramação" hint="Como o layout se organiza: margens, grid, hierarquia visual">
            <Textarea
              value={form.layoutNotes}
              onChange={(e) => set("layoutNotes", e.target.value)}
              placeholder="Ex: grid de 3 colunas, margem de 5% nas bordas, título sempre no terço superior..."
            />
          </Field>
          <Field label="Diretrizes gerais" hint="Composição, enquadramento, elementos fixos">
            <Textarea
              value={form.guidelines}
              onChange={(e) => set("guidelines", e.target.value)}
              placeholder="Ex: logo sempre no canto inferior direito, fundo com textura, foto do produto centralizada..."
              className="min-h-28"
            />
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
          label="Inspirações"
          images={referenceImages}
          onAdd={handleAddImages("reference")}
          onDelete={handleDeleteImage}
          emptyHint="Nenhuma referência ainda. Suba exemplos do padrão visual desejado."
        />
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <GalleryThumbnails size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Exemplos de aplicação</h3>
        </div>
        <ImageBoard
          label="Peças finalizadas"
          images={applicationImages}
          onAdd={handleAddImages("application")}
          onDelete={handleDeleteImage}
          emptyHint="Nenhum exemplo ainda. Suba peças já produzidas com esse padrão."
        />
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <ListChecks size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Do&apos;s &amp; Don&apos;ts</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="O que fazer">
            <Textarea
              value={form.doNotes}
              onChange={(e) => set("doNotes", e.target.value)}
              placeholder="Práticas que devem se repetir em toda peça"
            />
          </Field>
          <Field label="O que evitar">
            <Textarea
              value={form.dontNotes}
              onChange={(e) => set("dontNotes", e.target.value)}
              placeholder="Erros ou desvios comuns a não cometer"
            />
          </Field>
        </div>
      </Card>
    </div>
  );
}
