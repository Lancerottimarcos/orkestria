"use client";

import { useEffect, useState } from "react";
import { Images, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Textarea } from "@/components/ui/Input";
import { SaveBar } from "./SaveBar";
import { ImageBoard, type BoardImage } from "./ImageBoard";

export function MoodboardPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<BoardImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clientes/${clientId}/moodboard`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setDescription(data.description ?? "");
        setImages(data.images ?? []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${clientId}/moodboard`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  async function handleAddImages(dataUrls: string[]) {
    for (const dataUrl of dataUrls) {
      const res = await fetch(`/api/clientes/${clientId}/moodboard/images`, {
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
    await fetch(`/api/clientes/${clientId}/moodboard/images/${imageId}`, { method: "DELETE" });
  }

  if (loading) return <p className="text-sm text-muted">Carregando moodboard...</p>;

  return (
    <div className="flex flex-col gap-5">
      <SaveBar
        title="Moodboard"
        description="O painel de inspiração geral do cliente - cores, texturas, referências soltas."
        icon={<Images size={20} strokeWidth={1.8} />}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <Card padding="lg" className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <IconChip size="sm">
            <Sparkles size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Painel de inspiração</h3>
        </div>

        <ImageBoard
          label="Imagens de referência"
          images={images}
          onAdd={handleAddImages}
          onDelete={handleDeleteImage}
          emptyHint="Nenhuma imagem ainda. Suba fotos, prints e referências soltas que inspiram esse cliente."
        />

        <DottedDivider />

        <Field label="Notas do moodboard" hint="O que essas referências têm em comum, sensações que devem transmitir">
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSaved(false);
            }}
            placeholder="Ex: paleta terrosa, luz natural, clima aconchegante..."
            className="min-h-24"
          />
        </Field>
      </Card>
    </div>
  );
}
