"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/PageHeader";
import { resolveVariables, type ContractClient, type ContractCompany, type ContractServiceInfo } from "@/lib/contracts/variables";
import { ContractHtmlPreview } from "@/lib/contracts/htmlNodes";
import type { TipTapNode } from "@/lib/contracts/pdfNodes";

export type GenerateContractTemplate = {
  id: string;
  name: string;
  bodyJson: string;
};

export function GenerateContractModal({
  open,
  onClose,
  clientId,
  serviceId,
  templates,
  client,
  company,
  service,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  serviceId: string;
  templates: GenerateContractTemplate[];
  client: ContractClient;
  company: ContractCompany;
  service: ContractServiceInfo;
  onGenerated: (service: { contractUrl: string | null; contractName: string | null }) => void;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vars = useMemo(() => resolveVariables({ client, company, service }), [client, company, service]);
  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const doc = useMemo<TipTapNode>(() => {
    if (!selectedTemplate) return { type: "doc", content: [] };
    try {
      return JSON.parse(selectedTemplate.bodyJson);
    } catch {
      return { type: "doc", content: [] };
    }
  }, [selectedTemplate]);

  async function handleGenerate() {
    if (!selectedTemplate) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/clientes/${clientId}/servicos-contratados/${serviceId}/contrato/gerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate.id }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error ?? "Não foi possível gerar o contrato");
        return;
      }
      onGenerated(json);
      onClose();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Gerar" titleAccent="contrato" width="xl">
      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText size={20} strokeWidth={1.8} />}
          title="Nenhum modelo de contrato cadastrado"
          description="Crie um modelo em Configurações → Modelos de Contrato antes de gerar."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {templates.length > 1 && (
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}

          <div className="rounded-2xl bg-surface-2 border border-border p-8 max-h-[50vh] overflow-y-auto">
            <ContractHtmlPreview doc={doc} vars={vars} />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleGenerate} disabled={generating || !selectedTemplate}>
              {generating ? "Gerando..." : "Gerar e salvar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
