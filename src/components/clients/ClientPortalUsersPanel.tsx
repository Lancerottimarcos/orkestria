"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Copy, Check, Users2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/PageHeader";
import { DottedDivider } from "@/components/ui/Dotted";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/format";

type PortalUser = {
  id: string;
  name: string;
  role: string | null;
  email: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type FormState = { name: string; role: string; email: string };
const EMPTY: FormState = { name: "", role: "", email: "" };

export function ClientPortalUsersPanel({
  clientId,
  initialUsers,
}: {
  clientId: string;
  initialUsers: PortalUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { confirmDialog } = useConfirmDialog();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setGeneratedPassword(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(user: PortalUser) {
    setEditing(user);
    setForm({ name: user.name, role: user.role ?? "", email: user.email });
    setGeneratedPassword(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const url = editing
        ? `/api/clientes/${clientId}/portal-usuarios/${editing.id}`
        : `/api/clientes/${clientId}/portal-usuarios`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), role: form.role.trim(), email: form.email.trim() }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.fieldErrors?.email?.[0] ?? json?.error ?? "Não foi possível salvar");
        return;
      }
      if (editing) {
        const updated: PortalUser = json;
        setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        setModalOpen(false);
      } else {
        setUsers((list) => [...list, json.user]);
        setGeneratedPassword(json.password);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePassword(user: PortalUser) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/portal-usuarios/${user.id}/gerar-senha`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setEditing(user);
        setForm({ name: user.name, role: user.role ?? "", email: user.email });
        setGeneratedPassword(json.password);
        setModalOpen(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: PortalUser) {
    if (!(await confirmDialog(`Remover o acesso de "${user.name}"? Ela não conseguirá mais entrar no portal.`, { confirmLabel: "Remover" })))
      return;
    setUsers((list) => list.filter((u) => u.id !== user.id));
    await fetch(`/api/clientes/${clientId}/portal-usuarios/${user.id}`, { method: "DELETE" });
  }

  function copyCredentials() {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(
      `Portal: ${window.location.origin}/portal/login\nEmail: ${form.email}\nSenha: ${generatedPassword}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mt-10 mb-4 first:mt-0">
        <div className="flex items-center gap-3">
          <IconChip size="sm">
            <Users2 size={15} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Pessoas com acesso ao portal</h2>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Adicionar pessoa
        </Button>
      </div>

      {users.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Users2 size={20} strokeWidth={1.8} />}
            title="Só o login principal do cliente por enquanto"
            description="Adicione outras pessoas da equipe do cliente pra também aprovarem conteúdo - elas não veem a aba Serviços."
          />
        </Card>
      ) : (
        <Card padding="none" className="px-2 sm:px-3 py-2">
          {users.map((user, i) => (
            <div key={user.id}>
              {i > 0 && <DottedDivider className="mx-4" />}
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {user.name} {user.role && <span className="text-muted font-normal">· {user.role}</span>}
                  </p>
                  <p className="text-xs text-muted-2 truncate mt-0.5">{user.email}</p>
                </div>
                {!user.active && <Badge tone="muted">Inativa</Badge>}
                <span className="hidden sm:block text-xs text-muted-2 flex-shrink-0">
                  {user.lastLoginAt ? `Último acesso ${formatDate(user.lastLoginAt)}` : "Nunca acessou"}
                </span>
                <button
                  type="button"
                  onClick={() => handleGeneratePassword(user)}
                  title="Gerar nova senha"
                  className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(user)}
                  className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(user)}
                  className="p-2 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer flex-shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Editar" : "Nova"} titleAccent="pessoa" width="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nome">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome completo" required autoFocus />
          </Field>
          <Field label="Cargo" hint="Opcional">
            <Input value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Ex: Gerente de Marketing" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@cliente.com" required />
          </Field>
          {error && <p className="text-xs text-danger">{error}</p>}

          {generatedPassword && (
            <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-xs text-muted">Senha gerada - copie e envie pra pessoa, ela não será mostrada novamente:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-ink bg-surface px-2 py-1.5 rounded-md border border-border">
                  {generatedPassword}
                </code>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="text-muted hover:text-accent p-1.5 rounded-full hover:bg-surface transition-colors cursor-pointer flex-shrink-0"
                  title="Copiar login, senha e link"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              {generatedPassword ? "Fechar" : "Cancelar"}
            </Button>
            {!generatedPassword && (
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editing ? "Salvar" : "Adicionar e gerar senha"}
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </>
  );
}
