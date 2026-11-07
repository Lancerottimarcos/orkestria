"use client";

import { useEffect, useState } from "react";
import { UserRound, UserSearch, MapPin, HeartPulse, Zap } from "lucide-react";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { TagInput } from "@/components/ui/TagInput";
import { SaveBar } from "./SaveBar";

type PersonaState = {
  photoUrl: string;
  name: string;
  age: string;
  location: string;
  occupation: string;
  incomeLevel: string;
  painPoints: string[];
  desires: string[];
  goals: string[];
  objections: string[];
  buyingTriggers: string[];
  notes: string;
};

const EMPTY: PersonaState = {
  photoUrl: "",
  name: "",
  age: "",
  location: "",
  occupation: "",
  incomeLevel: "",
  painPoints: [],
  desires: [],
  goals: [],
  objections: [],
  buyingTriggers: [],
  notes: "",
};

export function PersonaPanel({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PersonaState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clientes/${clientId}/persona`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          photoUrl: data.photoUrl ?? "",
          name: data.name ?? "",
          age: data.age ?? "",
          location: data.location ?? "",
          occupation: data.occupation ?? "",
          incomeLevel: data.incomeLevel ?? "",
          painPoints: data.painPoints ?? [],
          desires: data.desires ?? [],
          goals: data.goals ?? [],
          objections: data.objections ?? [],
          buyingTriggers: data.buyingTriggers ?? [],
          notes: data.notes ?? "",
        });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function set<K extends keyof PersonaState>(key: K, value: PersonaState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/clientes/${clientId}/persona`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando persona...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <SaveBar
        title="Persona do cliente"
        description="O retrato de quem consome o conteúdo - para pautar toda a estratégia."
        icon={<UserSearch size={20} strokeWidth={1.8} />}
        saving={saving}
        saved={saved}
        onSave={handleSave}
      />

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <UserRound size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Identidade</h3>
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <AvatarUploadField
            name={form.name || "Persona"}
            value={form.photoUrl || null}
            onChange={(v) => set("photoUrl", v ?? "")}
          />
          <div className="flex-1 min-w-48">
            <Field label="Nome fictício">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Luiza, 30 anos" />
            </Field>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <MapPin size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Perfil demográfico</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <Field label="Idade">
            <Input value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="30" />
          </Field>
          <Field label="Localização">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="São Paulo" />
          </Field>
          <Field label="Profissão">
            <Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} placeholder="Dermatologista" />
          </Field>
          <Field label="Renda">
            <Input value={form.incomeLevel} onChange={(e) => set("incomeLevel", e.target.value)} placeholder="Classe A/B" />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <HeartPulse size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Comportamento</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Dores" hint="O que incomoda essa pessoa hoje">
            <TagInput value={form.painPoints} onChange={(v) => set("painPoints", v)} placeholder="Ex: falta de tempo" tone="danger" />
          </Field>
          <Field label="Desejos" hint="O que ela quer alcançar">
            <TagInput value={form.desires} onChange={(v) => set("desires", v)} placeholder="Ex: liberdade financeira" tone="success" />
          </Field>
          <Field label="Objetivos" hint="Metas concretas de curto/médio prazo">
            <TagInput value={form.goals} onChange={(v) => set("goals", v)} placeholder="Ex: dobrar faturamento" tone="accent" />
          </Field>
          <Field label="Objeções" hint="O que a impede de comprar">
            <TagInput value={form.objections} onChange={(v) => set("objections", v)} placeholder="Ex: preço, tempo" tone="neutral" />
          </Field>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <IconChip size="sm">
            <Zap size={15} strokeWidth={2} />
          </IconChip>
          <h3 className="text-base font-semibold text-ink">Gatilhos e observações</h3>
        </div>
        <div className="flex flex-col gap-5">
          <Field label="Gatilhos de compra" hint="O que a convence a fechar negócio">
            <TagInput value={form.buyingTriggers} onChange={(v) => set("buyingTriggers", v)} placeholder="Ex: prova social" tone="accent" />
          </Field>
          <Field label="Observações">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Contexto adicional sobre essa persona..." />
          </Field>
        </div>
      </Card>
    </div>
  );
}
