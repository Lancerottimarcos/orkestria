"use client";

import { useRef, useState } from "react";
import { Plus, Pencil, Trash2, Briefcase, FileText, Upload, Download, X as XIcon, CalendarClock, RefreshCw, CheckCircle2, Wand2, PenLine, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate, PERIOD_LABELS, type ContractedServicePeriod } from "@/lib/format";
import { cn } from "@/lib/cn";
import { GenerateContractModal, type GenerateContractTemplate } from "@/components/contracts/GenerateContractModal";
import type { ContractClient, ContractCompany } from "@/lib/contracts/variables";

type Period = ContractedServicePeriod;

type ContractedService = {
  id: string;
  name: string;
  scope: string | null;
  value: number;
  period: Period;
  startDate: string;
  renewalDate: string | null;
  contractUrl: string | null;
  contractName: string | null;
  signedAt?: string | null;
  signerName?: string | null;
  agencySignedAt?: string | null;
  agencySignerName?: string | null;
};

type FormState = {
  name: string;
  scope: string;
  value: string;
  period: Period;
  startDate: string;
  renewalDate: string;
};

const EMPTY: FormState = { name: "", scope: "", value: "0", period: "MONTHLY", startDate: "", renewalDate: "" };

function ServiceCard({
  clientId,
  service,
  onEdit,
  onDelete,
  onContractChange,
  client,
  company,
  templates,
}: {
  clientId: string;
  service: ContractedService;
  onEdit: () => void;
  onDelete: () => void;
  onContractChange: (next: ContractedService) => void;
  client: ContractClient;
  company: ContractCompany;
  templates: GenerateContractTemplate[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [signingAgency, setSigningAgency] = useState(false);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const awaitingAgencySignature = !!service.signedAt && !service.agencySignedAt;

  async function handleAgencySign() {
    setSigningAgency(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/servicos-contratados/${service.id}/assinar-agencia`, { method: "POST" });
      if (res.ok) {
        onContractChange(await res.json());
      } else {
        const data = await res.json().catch(() => null);
        await alertDialog(data?.error ?? "Não foi possível assinar. Tente novamente.");
      }
    } finally {
      setSigningAgency(false);
    }
  }
  const renewalSoon =
    service.renewalDate && new Date(service.renewalDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/clientes/${clientId}/servicos-contratados/${service.id}/contrato`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        onContractChange(await res.json());
        setJustUploaded(true);
        setTimeout(() => setJustUploaded(false), 3000);
      } else {
        const data = await res.json().catch(() => null);
        await alertDialog(data?.error ?? "Não foi possível enviar o contrato. Tente novamente.");
      }
    } catch {
      await alertDialog("Não foi possível enviar o contrato. Verifique sua conexão e tente novamente.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemoveContract() {
    if (!(await confirmDialog("Remover o contrato desse serviço? O cliente deixa de conseguir baixar no portal.", { confirmLabel: "Remover" })))
      return;
    const previous = service;
    onContractChange({ ...service, contractUrl: null, contractName: null });
    const res = await fetch(`/api/clientes/${clientId}/servicos-contratados/${service.id}/contrato`, { method: "DELETE" });
    if (!res.ok) {
      onContractChange(previous);
      await alertDialog("Não foi possível remover o contrato. Tente novamente.");
    }
  }

  return (
    <Card padding="none" className="overflow-hidden flex flex-col group">
      <div className="p-5 pb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-ink text-sm leading-snug">{service.name}</p>
            <p className="text-lg font-light tracking-tight text-ink mt-1 tabular-nums">
              {formatCurrency(service.value)}
              <span className="text-xs text-muted font-normal ml-1">/ {PERIOD_LABELS[service.period].toLowerCase()}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button type="button" onClick={onEdit} className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer">
              <Pencil size={13} />
            </button>
            <button type="button" onClick={onDelete} className="p-1.5 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {service.scope && <p className="text-xs text-muted leading-relaxed line-clamp-3">{service.scope}</p>}
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
        <div className="px-4 py-3 flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
            <CalendarClock size={10} /> Início
          </span>
          <span className="text-xs font-semibold text-ink tabular-nums">{formatDate(service.startDate)}</span>
        </div>
        <div className={cn("px-4 py-3 flex flex-col gap-1", renewalSoon && "bg-accent/10")}>
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide", renewalSoon ? "text-accent" : "text-muted-2")}>
            <RefreshCw size={10} /> Renovação
          </span>
          <span className={cn("text-xs font-semibold tabular-nums", renewalSoon ? "text-accent" : "text-ink")}>
            {service.renewalDate ? formatDate(service.renewalDate) : "-"}
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-border px-4 py-3 flex items-center gap-2.5">
        <span
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            justUploaded ? "bg-success/15 text-success" : "bg-surface-2 text-muted",
          )}
        >
          {justUploaded ? <CheckCircle2 size={14} strokeWidth={1.8} /> : <FileText size={14} strokeWidth={1.8} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">Contrato</p>
          <p className={cn("text-xs truncate", justUploaded ? "text-success font-medium" : "text-ink")}>
            {uploading ? "Enviando..." : justUploaded ? "Contrato enviado" : (service.contractName ?? "Nenhum PDF anexado")}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {service.contractUrl && (
            <>
              <a
                href={service.contractUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-surface-2 transition-colors"
                title="Baixar contrato"
              >
                <Download size={14} />
              </a>
              <button
                type="button"
                onClick={handleRemoveContract}
                className="text-muted hover:text-danger p-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
                title="Remover contrato"
              >
                <XIcon size={14} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setGenerateOpen(true)}
            className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
            title="Gerar contrato a partir de um modelo"
          >
            <Wand2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-50"
            title={service.contractUrl ? "Trocar PDF" : "Enviar PDF"}
          >
            <Upload size={14} />
          </button>
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {awaitingAgencySignature && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2.5 bg-accent/[0.06]">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-accent/15 text-accent">
            <PenLine size={14} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Cliente já assinou</p>
            <p className="text-xs text-ink">Falta a assinatura da agência</p>
          </div>
          <Button type="button" size="sm" variant="success" onClick={handleAgencySign} disabled={signingAgency}>
            {signingAgency ? "Assinando..." : "Assinar"}
          </Button>
        </div>
      )}
      {service.agencySignedAt && (
        <div className="border-t border-border px-4 py-3 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-success/15 text-success">
            <BadgeCheck size={14} strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-success">Assinado por ambas as partes</p>
            <p className="text-xs text-muted truncate">
              Cliente: {service.signerName} · Agência: {service.agencySignerName}
            </p>
          </div>
        </div>
      )}

      <GenerateContractModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        clientId={clientId}
        serviceId={service.id}
        templates={templates}
        client={client}
        company={company}
        service={{
          name: service.name,
          scope: service.scope,
          value: service.value,
          period: service.period,
          startDate: service.startDate,
          renewalDate: service.renewalDate,
        }}
        onGenerated={(updated) => {
          onContractChange({ ...service, ...updated });
          setJustUploaded(true);
          setTimeout(() => setJustUploaded(false), 3000);
        }}
      />
    </Card>
  );
}

export function ContractedServicesPanel({
  clientId,
  initialServices,
  client,
  company,
  templates,
}: {
  clientId: string;
  initialServices: ContractedService[];
  client: ContractClient;
  company: ContractCompany;
  templates: GenerateContractTemplate[];
}) {
  const [services, setServices] = useState(initialServices);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContractedService | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { confirmDialog } = useConfirmDialog();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, startDate: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(service: ContractedService) {
    setEditing(service);
    setForm({
      name: service.name,
      scope: service.scope ?? "",
      value: String(service.value),
      period: service.period,
      startDate: service.startDate.slice(0, 10),
      renewalDate: service.renewalDate ? service.renewalDate.slice(0, 10) : "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.startDate) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/clientes/${clientId}/servicos-contratados/${editing.id}`
        : `/api/clientes/${clientId}/servicos-contratados`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          scope: form.scope.trim(),
          value: form.value,
          period: form.period,
          startDate: form.startDate,
          renewalDate: form.renewalDate,
        }),
      });
      if (!res.ok) return;
      const saved: ContractedService = await res.json();
      setServices((list) => (editing ? list.map((s) => (s.id === saved.id ? saved : s)) : [saved, ...list]));
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(service: ContractedService) {
    if (!(await confirmDialog(`Remover o serviço "${service.name}"? Ele deixa de aparecer no portal do cliente.`, { confirmLabel: "Remover" })))
      return;
    setServices((list) => list.filter((s) => s.id !== service.id));
    await fetch(`/api/clientes/${clientId}/servicos-contratados/${service.id}`, { method: "DELETE" });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mt-10 mb-4 first:mt-0">
        <div className="flex items-center gap-3">
          <IconChip size="sm">
            <Briefcase size={15} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Serviços contratados</h2>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Adicionar serviço
        </Button>
      </div>

      {services.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Briefcase size={20} strokeWidth={1.8} />}
            title="Nenhum serviço contratado cadastrado"
            description="Cadastre o que este cliente contratou pra ele ver os detalhes e o contrato no Portal do Cliente."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} /> Adicionar serviço
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              clientId={clientId}
              service={service}
              onEdit={() => openEdit(service)}
              onDelete={() => handleDelete(service)}
              onContractChange={(next) => setServices((list) => list.map((s) => (s.id === next.id ? next : s)))}
              client={client}
              company={company}
              templates={templates}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar" : "Novo"} titleAccent="serviço contratado" width="md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Serviço contratado">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Gestão de redes sociais" required autoFocus />
          </Field>
          <Field label="Escopo do serviço contratado" hint="Opcional">
            <Textarea
              value={form.scope}
              onChange={(e) => set("scope", e.target.value)}
              placeholder="O que está incluído nesse serviço"
              rows={3}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} />
            </Field>
            <Field label="Período">
              <Select value={form.period} onChange={(e) => set("period", e.target.value as Period)}>
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <option key={p} value={p}>
                    {PERIOD_LABELS[p]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Data de início">
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
            </Field>
            <Field label="Data de renovação" hint="Opcional">
              <Input type="date" value={form.renewalDate} onChange={(e) => set("renewalDate", e.target.value)} />
            </Field>
          </div>
          {editing && (
            <p className="text-xs text-muted-2 -mt-1">
              O contrato em PDF é enviado direto no card do serviço, depois de salvar.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
