"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Copy, Check, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/PageHeader";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Credential = {
  id: string;
  label: string;
  username: string | null;
  url: string | null;
  notes: string | null;
};

type FormState = { label: string; username: string; url: string; notes: string; secret: string };
const EMPTY: FormState = { label: "", username: "", url: "", notes: "", secret: "" };

export function ClientCredentialsPanel({ clientId, initialCredentials }: { clientId: string; initialCredentials: Credential[] }) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirmDialog, alertDialog } = useConfirmDialog();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(credential: Credential) {
    setEditing(credential);
    setForm({ label: credential.label, username: credential.username ?? "", url: credential.url ?? "", notes: credential.notes ?? "", secret: "" });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.label.trim()) {
      setError("Informe um rótulo");
      return;
    }
    if (!editing && !form.secret.trim()) {
      setError("Informe a senha");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/clientes/${clientId}/senhas/${editing.id}` : `/api/clientes/${clientId}/senhas`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError("Não foi possível salvar");
        return;
      }
      const saved = await res.json();
      setCredentials((prev) => (editing ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]));
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(credential: Credential) {
    if (!(await confirmDialog(`Excluir a credencial "${credential.label}"?`, { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/clientes/${clientId}/senhas/${credential.id}`, { method: "DELETE" });
    if (res.ok) {
      setCredentials((prev) => prev.filter((c) => c.id !== credential.id));
    } else {
      await alertDialog("Não foi possível excluir a credencial. Tente novamente.");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mt-10 mb-4 first:mt-0">
        <div className="flex items-center gap-3">
          <IconChip size="sm">
            <KeyRound size={15} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Senhas</h2>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Nova credencial
        </Button>
      </div>

      {credentials.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<KeyRound size={20} strokeWidth={1.8} />}
            title="Nenhuma credencial guardada"
            description="Salve acessos de ferramentas/contas desse cliente aqui - chega de senha perdida no WhatsApp."
          />
        </Card>
      ) : (
        <Card padding="none" className="px-2 sm:px-3 py-2 divide-y divide-border">
          {credentials.map((c) => (
            <CredentialRowWithReveal key={c.id} clientId={clientId} credential={c} onEdit={() => openEdit(c)} onDelete={() => handleDelete(c)} />
          ))}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar" : "Nova"} titleAccent="credencial" width="sm">
        <div className="flex flex-col gap-4">
          <Field label="Rótulo">
            <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Ex: Instagram, hospedagem, domínio..." />
          </Field>
          <Field label="Usuário/login" hint="Opcional">
            <Input value={form.username} onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label="Senha" hint={editing ? "Deixe em branco pra manter a atual" : undefined}>
            <Input type="text" value={form.secret} onChange={(e) => set("secret", e.target.value)} placeholder={editing ? "••••••••" : ""} />
          </Field>
          <Field label="URL" hint="Opcional">
            <Input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Notas" hint="Opcional">
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CredentialRowWithReveal({
  clientId,
  credential,
  onEdit,
  onDelete,
}: {
  clientId: string;
  credential: Credential;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggleReveal() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/senhas/${credential.id}/revelar`);
      if (res.ok) {
        const data = await res.json();
        setRevealed(data.secret);
      }
    } finally {
      setRevealing(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <IconChip size="sm">
        <KeyRound size={14} strokeWidth={2} />
      </IconChip>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-ink truncate">{credential.label}</p>
          {credential.url && (
            <a href={credential.url} target="_blank" rel="noreferrer" className="text-muted-2 hover:text-accent flex-shrink-0">
              <ExternalLink size={11} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {credential.username && <span className="text-xs text-muted-2">{credential.username}</span>}
          <span className="text-xs text-muted-2 font-mono tabular-nums">{revealed ?? "••••••••"}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleReveal}
        disabled={revealing}
        className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0"
        title={revealed ? "Ocultar" : "Revelar senha"}
      >
        {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      {revealed && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(revealed);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0"
          title="Copiar"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
        </button>
      )}
      <button type="button" onClick={onEdit} className="p-1.5 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0">
        <Pencil size={13} />
      </button>
      <button type="button" onClick={onDelete} className="p-1.5 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
