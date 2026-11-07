"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, ImagePlus, X, Check, Star, Eye } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { DottedDivider } from "@/components/ui/Dotted";
import { ContractEditor, type ContractEditorHandle } from "@/components/contracts/ContractEditor";
import { PROPOSTA_VARIABLE_GROUPS } from "@/lib/proposals/variables";
import { cn } from "@/lib/cn";

type Template = {
  id: string;
  name: string;
  bodyJson: string;
  headerUrl: string | null;
  footerUrl: string | null;
  isDefault: boolean;
};

type Slot = "header" | "footer";
const SLOT_LABELS: Record<Slot, string> = { header: "Cabeçalho", footer: "Rodapé" };

function BrandImageSlot({
  templateId,
  slot,
  value,
  onChange,
}: {
  templateId: string;
  slot: Slot;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("slot", slot);
      form.append("file", file);
      const res = await fetch(`/api/configuracoes/propostas-modelos/${templateId}/imagem`, { method: "POST", body: form });
      if (res.ok) {
        const template = await res.json();
        onChange(template[slot === "header" ? "headerUrl" : "footerUrl"]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    onChange(null);
    await fetch(`/api/configuracoes/propostas-modelos/${templateId}/imagem?slot=${slot}`, { method: "DELETE" });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16 flex-shrink-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "group relative w-full h-full rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center border border-dashed disabled:opacity-60",
            value
              ? "border-transparent bg-[repeating-conic-gradient(var(--color-surface-3)_0%_25%,transparent_0%_50%)] bg-[length:10px_10px]"
              : "border-border-2 bg-surface-2",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={SLOT_LABELS[slot]} className="w-full h-full object-contain p-2" />
          ) : (
            <ImagePlus size={16} className="text-muted" />
          )}
          <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity">
            {value ? "Trocar" : "Enviar"}
          </span>
        </button>
        {value && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors cursor-pointer"
            title="Remover"
          >
            <X size={11} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFile} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{SLOT_LABELS[slot]}</p>
        <p className="text-xs text-muted-2">PNG, JPG ou WEBP</p>
      </div>
    </div>
  );
}

export function ProposalTemplateEditorScreen({ template }: { template: Template }) {
  const router = useRouter();
  const editorRef = useRef<ContractEditorHandle>(null);
  const [name, setName] = useState(template.name);
  const [bodyJson, setBodyJson] = useState<JSONContent>(() => {
    try {
      return JSON.parse(template.bodyJson);
    } catch {
      return { type: "doc", content: [{ type: "paragraph" }] };
    }
  });
  const [headerUrl, setHeaderUrl] = useState(template.headerUrl);
  const [footerUrl, setFooterUrl] = useState(template.footerUrl);
  const [isDefault, setIsDefault] = useState(template.isDefault);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/configuracoes/propostas-modelos/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bodyJson: JSON.stringify(bodyJson), isDefault }),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/configuracoes/propostas"
            className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={16} />
          </Link>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold max-w-xs sm:max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <a href={`/configuracoes/propostas/${template.id}/preview`} target="_blank" rel="noreferrer" title="Mostra a última versão salva, no layout que o cliente vê">
            <Button variant="ghost" type="button">
              <Eye size={14} /> Pré-visualizar
            </Button>
          </a>
          <Button onClick={handleSave} disabled={saving}>
            {saved ? (
              <>
                <Check size={14} /> Salvo
              </>
            ) : saving ? (
              "Salvando..."
            ) : (
              "Salvar modelo"
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 items-start">
        <Card padding="none">
          <ContractEditor ref={editorRef} defaultContent={bodyJson} onChange={setBodyJson} />
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <p className="text-sm font-semibold text-ink mb-1">Variáveis</p>
            <p className="text-xs text-muted mb-4">Clique pra inserir no texto onde o cursor estiver.</p>
            <div className="flex flex-col gap-4">
              {PROPOSTA_VARIABLE_GROUPS.map((group, i) => (
                <div key={group.key}>
                  {i > 0 && <DottedDivider className="mb-4" />}
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2 mb-2">{group.label}</p>
                  <div className="flex flex-col gap-1">
                    {group.variables.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        onClick={() => editorRef.current?.insertVariable(variable.key, variable.label)}
                        className="text-left text-xs text-muted hover:text-accent hover:bg-surface-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                      >
                        {variable.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-sm font-semibold text-ink mb-4">Cabeçalho e rodapé</p>
            <div className="flex flex-col gap-4">
              <BrandImageSlot templateId={template.id} slot="header" value={headerUrl} onChange={setHeaderUrl} />
              <BrandImageSlot templateId={template.id} slot="footer" value={footerUrl} onChange={setFooterUrl} />
            </div>
          </Card>

          <Card>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              <span className="text-sm text-ink flex items-center gap-1.5">
                <Star size={13} className="text-accent" /> Usar como modelo padrão
              </span>
            </label>
            <p className="text-xs text-muted-2 mt-2">
              O modelo padrão fica pré-selecionado ao criar uma nova proposta comercial.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
