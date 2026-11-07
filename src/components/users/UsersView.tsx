"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, ShieldCheck, Briefcase, UserCog, KeyRound, Copy, Check, AlertTriangle, Clock } from "lucide-react";
import { userSchema, type UserInput, type UserFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { IconChip } from "@/components/ui/IconChip";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { FilterBar, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { ViewTabs } from "@/components/views/ViewTabs";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import { MODULE_KEYS, MODULE_LABELS, LEGACY_MEMBER_DEFAULT_MODULES, resolveAllowedModules } from "@/lib/modules";
import { resolveClientAccess } from "@/lib/clientAccess";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Checkbox } from "@/components/ui/Checkbox";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  setor: string | null;
  cargo: string | null;
  active: boolean;
  moduleAccess: string | null;
  clientAccess: string | null;
  avatarUrl: string | null;
  passwordResetRequestedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type ModalTab = "dados" | "atividade";

export function UsersView({
  initialUsers,
  currentUserId,
  canManage,
  clients,
}: {
  initialUsers: UserRow[];
  currentUserId: string;
  canManage: boolean;
  clients: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [setorFilter, setSetorFilter] = useState("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(LEGACY_MEMBER_DEFAULT_MODULES);
  const [clientRestricted, setClientRestricted] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("dados");
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserFormValues, unknown, UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "MEMBER", active: true },
  });

  const watchedRole = watch("role");
  const watchedPassword = watch("password");

  function toggleModule(key: string) {
    setSelectedModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function toggleClient(id: string) {
    setSelectedClients((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setGeneratedPassword(null);
    reset({ name: "", email: "", password: "", role: "MEMBER", setor: "", cargo: "", active: true });
    setSelectedModules(LEGACY_MEMBER_DEFAULT_MODULES);
    setClientRestricted(false);
    setSelectedClients([]);
    setAvatarUrl(null);
    setModalTab("dados");
    setModalOpen(true);
  }

  function openEdit(user: UserRow) {
    setEditing(user);
    setFormError(null);
    setGeneratedPassword(null);
    reset({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      setor: user.setor ?? "",
      cargo: user.cargo ?? "",
      active: user.active,
    });
    setSelectedModules(resolveAllowedModules(user.role, user.moduleAccess));
    const clientScope = resolveClientAccess(user.role, user.clientAccess);
    setClientRestricted(clientScope !== null);
    setSelectedClients(clientScope ?? []);
    setAvatarUrl(user.avatarUrl);
    setModalTab("dados");
    setModalOpen(true);
  }

  async function handleGeneratePassword() {
    if (!editing) return;
    setGeneratingPassword(true);
    setGeneratedPassword(null);
    try {
      const res = await fetch(`/api/usuarios/${editing.id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setGeneratedPassword(json.password);
        const updated = await fetch("/api/usuarios").then((r) => r.json());
        setUsers(updated);
      } else {
        await alertDialog(json.error ?? "Não foi possível gerar a senha");
      }
    } finally {
      setGeneratingPassword(false);
    }
  }

  function copyCredentials() {
    if (!generatedPassword || !editing) return;
    const loginUrl = `${window.location.origin}/login`;
    navigator.clipboard.writeText(
      `Login: ${loginUrl}\nEmail: ${editing.email}\nSenha: ${generatedPassword}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function onSubmit(data: UserInput) {
    setSubmitting(true);
    setFormError(null);
    try {
      const url = editing ? `/api/usuarios/${editing.id}` : "/api/usuarios";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          modules: selectedModules,
          clients: clientRestricted ? selectedClients : null,
          avatarUrl: avatarUrl ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.formErrors?.[0] ?? "Falha ao salvar usuário");
        return;
      }
      setModalOpen(false);
      const updated = await fetch("/api/usuarios").then((r) => r.json());
      setUsers(updated);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(user: UserRow) {
    if (!(await confirmDialog(`Remover o usuário "${user.name}"?`, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/usuarios/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      router.refresh();
    } else {
      const json = await res.json();
      await alertDialog(json.error ?? "Não foi possível remover o usuário");
    }
  }

  const setores = useMemo(
    () => Array.from(new Set(users.map((u) => u.setor).filter((s): s is string => !!s))).sort(),
    [users],
  );
  const cargos = useMemo(
    () => Array.from(new Set(users.map((u) => u.cargo).filter((c): c is string => !!c))).sort(),
    [users],
  );

  const filtered = useMemo(
    () =>
      users
        .filter((u) => !setorFilter || u.setor === setorFilter)
        .filter((u) => !cargoFilter || u.cargo === cargoFilter)
        .filter((u) => !roleFilter || u.role === roleFilter),
    [users, setorFilter, cargoFilter, roleFilter],
  );

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.active).length,
      admins: users.filter((u) => u.role === "ADMIN").length,
    }),
    [users],
  );

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Contas de acesso ao sistema"
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo usuário
            </Button>
          )
        }
      />

      <StatPillRow
        className="mb-8"
        items={[
          { label: "Total de usuários", display: stats.total, tone: "dark", weight: stats.total },
          { label: "Ativos", display: stats.active, tone: "accent", weight: stats.active },
          { label: "Administradores", display: stats.admins, tone: "hatch", weight: Math.max(stats.admins, 1) },
        ]}
      />

      <FilterBar>
        <FilterSelect icon={UserCog} value={setorFilter} onChange={(e) => setSetorFilter(e.target.value)}>
          <option value="">Todo setor</option>
          {setores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={Briefcase} value={cargoFilter} onChange={(e) => setCargoFilter(e.target.value)}>
          <option value="">Todo cargo</option>
          {cargos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={ShieldCheck} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Toda permissão</option>
          <option value="ADMIN">Administrador</option>
          <option value="MEMBER">Membro</option>
        </FilterSelect>
        {(setorFilter || cargoFilter || roleFilter) && (
          <FilterClearButton
            onClick={() => {
              setSetorFilter("");
              setCargoFilter("");
              setRoleFilter("");
            }}
          />
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<ShieldCheck size={20} strokeWidth={1.8} />}
            title={users.length === 0 ? "Nenhum usuário cadastrado" : "Nenhum usuário encontrado"}
            description={
              users.length === 0
                ? "Crie contas de acesso para as pessoas da agência."
                : "Tente ajustar os filtros."
            }
            action={
              users.length === 0 &&
              canManage && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={14} /> Novo usuário
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Nome</Th>
            <Th>Setor</Th>
            <Th>Cargo</Th>
            <Th>Permissão</Th>
            <Th>Status</Th>
            <Th>Último acesso</Th>
            {canManage && <Th className="text-right">Ações</Th>}
          </Thead>
          <tbody>
            {filtered.map((user) => (
              <Tr key={user.id} className="group">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} url={user.avatarUrl} size={38} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">
                        {user.name} {user.id === currentUserId && <span className="text-xs text-muted">(você)</span>}
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">{user.email}</p>
                      {user.passwordResetRequestedAt && (
                        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-0.5 mt-1.5">
                          <AlertTriangle size={11} /> Pediu redefinição de senha
                        </p>
                      )}
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{user.setor || "-"}</Td>
                <Td className="text-muted">{user.cargo || "-"}</Td>
                <Td>
                  <Badge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
                    {ROLE_LABELS[user.role]}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={user.active ? "success" : "muted"}>
                    {user.active ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                <Td className="text-muted text-xs whitespace-nowrap tabular-nums">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca acessou"}
                </Td>
                {canManage && (
                  <Td>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(user)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="usuário"
      >
        {editing && (
          <ViewTabs
            value={modalTab}
            onChange={setModalTab}
            options={[
              { key: "dados", label: "Dados", icon: UserCog },
              { key: "atividade", label: "Atividade", icon: Clock },
            ]}
          />
        )}

        {modalTab === "atividade" && editing ? (
          <div className="flex flex-col gap-5 mt-5">
            <div className="flex items-center gap-3">
              <IconChip tone="accent">
                <Clock size={18} strokeWidth={1.8} />
              </IconChip>
              <p className="text-base font-semibold text-ink">Atividade da conta</p>
            </div>
            <div className="flex flex-col gap-3">
              <DottedRow
                label="Último acesso"
                value={editing.lastLoginAt ? formatDateTime(editing.lastLoginAt) : "Nunca acessou o sistema"}
              />
              <DottedRow label="Conta criada em" value={formatDateTime(editing.createdAt)} />
            </div>
            <DottedDivider />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className={editing ? "flex flex-col gap-4 mt-4" : "flex flex-col gap-4"}>
          <AvatarUploadField name={editing?.name ?? "?"} value={avatarUrl} onChange={setAvatarUrl} />

          <Field label="Nome" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Nome completo" />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} placeholder="email@agencia.com" />
          </Field>

          <Field
            label={editing ? "Nova senha (opcional)" : "Senha"}
            error={errors.password?.message}
            hint={editing ? "Deixe em branco para manter a senha atual" : undefined}
          >
            <PasswordInput {...register("password")} placeholder="••••••••" />
          </Field>
          <PasswordStrength value={watchedPassword ?? ""} />

          {editing && (
            <div className="flex flex-col gap-2">
              {editing.passwordResetRequestedAt && (
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 rounded-full px-4 py-2">
                  <AlertTriangle size={13} /> Este usuário pediu para redefinir a senha
                </p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGeneratePassword}
                disabled={generatingPassword}
                className="self-start"
              >
                <KeyRound size={14} />
                {generatingPassword ? "Gerando..." : "Gerar nova senha aleatória"}
              </Button>

              {generatedPassword && (
                <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-2.5">
                  <p className="text-xs text-muted">
                    Senha gerada - copie e envie ao usuário, ela não será mostrada novamente:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono text-ink bg-surface px-3 py-2 rounded-xl">
                      {generatedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={copyCredentials}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface transition-colors cursor-pointer"
                      title="Copiar credenciais"
                    >
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Setor" hint="Ex: Design, Atendimento, Gestão">
              <Input {...register("setor")} placeholder="Setor" list="setores-list" />
              <datalist id="setores-list">
                {setores.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
            <Field label="Cargo" hint="Ex: Social Media, Designer Pleno">
              <Input {...register("cargo")} placeholder="Cargo" list="cargos-list" />
              <datalist id="cargos-list">
                {cargos.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Nível de acesso">
            <Select {...register("role")} disabled={editing?.id === currentUserId}>
              <option value="MEMBER">Membro</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>

          {watchedRole === "MEMBER" && (
            <Field label="Módulos liberados" hint="Escolha exatamente o que esse usuário pode acessar">
              <div className="grid grid-cols-2 gap-2.5 rounded-2xl p-4 bg-surface-2">
                {MODULE_KEYS.map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                    <Checkbox checked={selectedModules.includes(key)} onChange={() => toggleModule(key)} />
                    {MODULE_LABELS[key]}
                  </label>
                ))}
              </div>
            </Field>
          )}

          {watchedRole === "MEMBER" && (
            <Field
              label="Clientes visíveis"
              hint="Restringe quais clientes essa pessoa vê na listagem e na ficha - útil pra freelancer/subcontratado. Não afeta Kanban, Financeiro ou outros módulos, só a área Clientes."
            >
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer mb-2.5">
                <Checkbox
                  checked={!clientRestricted}
                  onChange={() => setClientRestricted((prev) => !prev)}
                />
                Vê todos os clientes
              </label>
              {clientRestricted && (
                <div className="grid grid-cols-2 gap-2.5 rounded-2xl p-4 bg-surface-2 max-h-52 overflow-y-auto">
                  {clients.length === 0 ? (
                    <p className="text-xs text-muted col-span-2">Nenhum cliente cadastrado ainda.</p>
                  ) : (
                    clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
                        <Checkbox checked={selectedClients.includes(c.id)} onChange={() => toggleClient(c.id)} />
                        {c.name}
                      </label>
                    ))
                  )}
                </div>
              )}
            </Field>
          )}

          <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
            <Checkbox {...register("active")} disabled={editing?.id === currentUserId} />
            Ativo
          </label>

          {formError && <p className="text-xs text-danger">{formError}</p>}

          <DottedDivider className="mt-2" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
        )}
      </Modal>
    </div>
  );
}
