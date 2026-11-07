"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, FormInput, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Checkbox } from "@/components/ui/Checkbox";
import { CUSTOM_FORM_FIELD_TYPE_LABELS } from "@/lib/labels";
import type { Option, FormField, FieldType } from "./types";

const FIELD_TYPES: FieldType[] = ["TEXT", "TEXTAREA", "SELECT", "RADIO", "CHECKBOX", "DATE", "RATING"];
const OPTIONS_TYPES: FieldType[] = ["SELECT", "RADIO", "CHECKBOX"];

const EMPTY_FIELD: FormField = { label: "", type: "TEXT", required: false, options: [] };

export function FormBuilderPage({
  formId,
  clients,
  initialTitle,
  initialDescription,
  initialClientId,
  initialActive,
  initialFields,
}: {
  formId: string | null;
  clients: (Option & { avatarUrl: string | null })[];
  initialTitle?: string;
  initialDescription?: string;
  initialClientId?: string;
  initialActive?: boolean;
  initialFields?: FormField[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [active, setActive] = useState(initialActive ?? true);
  const [fields, setFields] = useState<FormField[]>(initialFields?.length ? initialFields : [{ ...EMPTY_FIELD }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    setFields((prev) => [...prev, { ...EMPTY_FIELD }]);
  }

  function removeField(index: number) {
    setFields((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateOptionsText(index: number, text: string) {
    const options = text.split("\n").map((o) => o.trim()).filter(Boolean);
    updateField(index, { options });
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Informe o título do formulário");
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) {
      setError("Adicione ao menos um campo");
      return;
    }
    if (validFields.some((f) => OPTIONS_TYPES.includes(f.type) && f.options.length === 0)) {
      setError("Campos de seleção precisam de ao menos uma opção");
      return;
    }

    setSubmitting(true);
    try {
      const body = { title, description, clientId, active, fields: validFields };
      const url = formId ? `/api/formularios/${formId}` : "/api/formularios";
      const method = formId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push("/ferramentas/formularios");
        router.refresh();
      } else {
        setError("Não foi possível salvar o formulário");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/ferramentas/formularios"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Voltar para Formulários
      </Link>

      <PageHeader
        title={formId ? "Editar formulário" : "Novo formulário"}
        description="Monte os campos do formulário e compartilhe o link com o cliente."
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => router.push("/ferramentas/formularios")}>
              Cancelar
            </Button>
            <Button type="button" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <Card padding="lg" className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <IconChip tone="accent">
              <FormInput size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Informações</h2>
          </div>

          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Briefing de campanha" />
          </Field>

          <Field label="Descrição" hint="Opcional, aparece no topo do formulário">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explique o objetivo deste formulário" />
          </Field>

          <Field label="Cliente" hint="Opcional">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Sem cliente vinculado</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
              <option value="1">Ativo (recebendo respostas)</option>
              <option value="0">Inativo</option>
            </Select>
          </Field>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <IconChip>
              <ListChecks size={18} strokeWidth={1.8} />
            </IconChip>
            <h2 className="text-base font-semibold text-ink">Campos</h2>
          </div>

          {fields.map((field, index) => (
            <Card key={index} padding="sm" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <GripVertical size={14} className="text-muted-2 flex-shrink-0" />
                <Input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Rótulo do campo"
                  className="flex-1 min-w-40"
                />
                <Select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value as FieldType })}
                  className="w-44 flex-shrink-0"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{CUSTOM_FORM_FIELD_TYPE_LABELS[t]}</option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-accent hover:bg-surface-3 disabled:opacity-30 disabled:hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, 1)}
                  disabled={index === fields.length - 1}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-accent hover:bg-surface-3 disabled:opacity-30 disabled:hover:bg-surface-2 cursor-pointer transition-colors"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-surface-2 text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {OPTIONS_TYPES.includes(field.type) && (
                <Textarea
                  value={field.options.join("\n")}
                  onChange={(e) => updateOptionsText(index, e.target.value)}
                  placeholder={"Uma opção por linha"}
                  className="min-h-16"
                />
              )}

              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer pl-1.5">
                <Checkbox checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} />
                Obrigatório
              </label>
            </Card>
          ))}

          <Button type="button" variant="ghost" onClick={addField} className="w-full border-dotted">
            <Plus size={14} /> Adicionar campo
          </Button>

          {error && <p className="text-xs text-danger pl-1.5">{error}</p>}
        </div>
      </div>
    </div>
  );
}
