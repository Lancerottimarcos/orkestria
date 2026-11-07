"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Users, CircleDot, ArrowUpDown, KeyRound, Copy, Check, AlertTriangle, Link2 } from "lucide-react";
import { clientSchema, type ClientInput, type ClientFormValues } from "@/lib/schemas";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_TONE } from "@/lib/labels";
import { slugify } from "@/lib/slug";
import { CLIENT_COVER_PRESETS, resolveClientCoverColor } from "@/lib/clientCover";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { extractDominantColor } from "@/lib/extractDominantColor";
import { CLIENT_ICONS, clientIconFor } from "@/lib/clientIcons";
import { Checkbox } from "@/components/ui/Checkbox";
import { healthColor } from "@/lib/clientHealth";

type SortKey = "name" | "monthlyValue" | "startDate";

function StatDotRow({ value, label, color }: { value: number; label: string; color: string }) {
  if (value === 0) return null;
  return (
    <DottedRow
      label={label}
      value={value}
      icon={<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
    />
  );
}

type PostStats = { pending: number; approved: number; changesRequested: number; rejected: number };

type ClientRow = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  monthlyValue: number;
  billingDay: number;
  status: "ACTIVE" | "PAUSED" | "CHURNED";
  startDate: string;
  notes: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverColor: string | null;
  icon: string | null;
  portalEnabled: boolean;
  portalEmail: string | null;
  portalSlug: string | null;
  passwordResetRequestedAt: string | null;
  _count: { projects: number };
  postStats?: PostStats;
  services?: string[];
  health?: { score: number; signals: string[] };
};

export function ClientsView({ initialClients, isAdmin }: { initialClients: ClientRow[]; isAdmin: boolean }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPassword, setGeneratingPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverColor, setCoverColor] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues, unknown, ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: "ACTIVE",
      billingDay: 5,
      monthlyValue: 0,
    },
  });

  function openCreate() {
    setEditing(null);
    setGeneratedPassword(null);
    setAvatarUrl(null);
    setCoverColor(CLIENT_COVER_PRESETS[0]);
    setIcon(null);
    reset({
      name: "",
      contactName: "",
      email: "",
      phone: "",
      document: "",
      address: "",
      monthlyValue: 0,
      billingDay: 5,
      status: "ACTIVE",
      startDate: toDateInputValue(new Date()),
      notes: "",
      portalEnabled: false,
      portalEmail: "",
      portalSlug: "",
    });
    setModalOpen(true);
  }

  function openEdit(client: ClientRow) {
    setEditing(client);
    setGeneratedPassword(null);
    setAvatarUrl(client.avatarUrl);
    setCoverColor(client.coverColor);
    setIcon(client.icon);
    reset({
      name: client.name,
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      document: client.document ?? "",
      address: client.address ?? "",
      monthlyValue: client.monthlyValue,
      billingDay: client.billingDay,
      status: client.status,
      startDate: toDateInputValue(client.startDate),
      notes: client.notes ?? "",
      portalEnabled: client.portalEnabled,
      portalEmail: client.portalEmail ?? "",
      portalSlug: client.portalSlug ?? "",
    });
    setModalOpen(true);
  }

  /**
   * Ao subir uma foto/logo, sugere a cor de capa a partir da cor dominante
   * da imagem - a pessoa entra com o cliente já com uma capa combinando com
   * a marca, e pode trocar com calma pelos presets ou pelo seletor livre.
   */
  async function handleAvatarChange(dataUrl: string | null) {
    setAvatarUrl(dataUrl);
    if (!dataUrl) return;
    const extracted = await extractDominantColor(dataUrl);
    if (extracted) setCoverColor(extracted);
  }

  async function generatePasswordForClient(clientId: string) {
    setGeneratingPassword(true);
    setGeneratedPassword(null);
    try {
      const res = await fetch(`/api/clientes/${clientId}/portal-password`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setGeneratedPassword(json.password);
        const updated = await fetch("/api/clientes").then((r) => r.json());
        setClients(updated);
        const fresh = updated.find((c: ClientRow) => c.id === clientId);
        if (fresh) setEditing(fresh);
      } else {
        await alertDialog(json.error ?? "Não foi possível gerar a senha");
      }
    } finally {
      setGeneratingPassword(false);
    }
  }

  async function handleGeneratePassword() {
    if (editing) {
      await handleSubmit(async (data) => {
        setSubmitting(true);
        try {
          const res = await fetch(`/api/clientes/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...data, avatarUrl: avatarUrl ?? "", coverColor: coverColor ?? "", icon: icon ?? "" }),
          });
          if (!res.ok) {
            const json = await res.json().catch(() => null);
            await alertDialog(json?.error?.fieldErrors?.portalSlug?.[0] ?? "Não foi possível salvar o cliente");
            return;
          }
          router.refresh();
          await generatePasswordForClient(editing.id);
        } finally {
          setSubmitting(false);
        }
      })();
      return;
    }

    await handleSubmit(async (data) => {
      setSubmitting(true);
      try {
        const res = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, avatarUrl: avatarUrl ?? "", coverColor: coverColor ?? "", icon: icon ?? "" }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          await alertDialog(json?.error?.fieldErrors?.portalSlug?.[0] ?? "Não foi possível criar o cliente");
          return;
        }
        const created: ClientRow = await res.json();
        setEditing(created);
        const updated = await fetch("/api/clientes").then((r) => r.json());
        setClients(updated);
        router.refresh();
        await generatePasswordForClient(created.id);
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function copyCredentials() {
    if (!generatedPassword) return;
    const portalUrl = editing?.portalSlug
      ? `${window.location.origin}/p/${editing.portalSlug}`
      : `${window.location.origin}/portal/login`;
    const email = watch("portalEmail") || "";
    navigator.clipboard.writeText(
      `Portal: ${portalUrl}\nEmail: ${email}\nSenha: ${generatedPassword}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function copyPortalLink(client: ClientRow) {
    if (!client.portalSlug) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${client.portalSlug}`);
    setCopiedLinkId(client.id);
    setTimeout(() => setCopiedLinkId(null), 1800);
  }

  async function onSubmit(data: ClientInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/clientes/${editing.id}` : "/api/clientes";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, avatarUrl: avatarUrl ?? "", coverColor: coverColor ?? "", icon: icon ?? "" }),
      });
      if (!res.ok) throw new Error("Falha ao salvar cliente");
      setModalOpen(false);
      router.refresh();
      const updated = await fetch("/api/clientes").then((r) => r.json());
      setClients(updated);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(client: ClientRow) {
    if (
      !(await confirmDialog(
        `Remover o cliente "${client.name}"? Isso apaga pra sempre a estratégia (persona, posicionamento, moodboard), posts e anexos, todo o histórico de chat, o cofre de senhas e contratos já assinados desse cliente. Lançamentos financeiros não são apagados, mas ficam sem cliente vinculado.`,
        { confirmLabel: "Remover" },
      ))
    )
      return;
    const res = await fetch(`/api/clientes/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      router.refresh();
    } else {
      await alertDialog("Não foi possível remover o cliente - essa ação é restrita ao administrador.");
    }
  }

  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === "ACTIVE");
    return {
      total: clients.length,
      active: active.length,
      mrr: active.reduce((sum, c) => sum + c.monthlyValue, 0),
    };
  }, [clients]);

  const watchedPortalEnabled = watch("portalEnabled");
  const watchedName = watch("name");

  const filtered = useMemo(() => {
    return clients
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => !statusFilter || c.status === statusFilter)
      .sort((a, b) => {
        if (sortKey === "monthlyValue") return b.monthlyValue - a.monthlyValue;
        if (sortKey === "startDate") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        return a.name.localeCompare(b.name);
      });
  }, [clients, search, statusFilter, sortKey]);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes e mensalidades da agência"
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo cliente
          </Button>
        }
      />

      <StatPillRow
        className="mb-8"
        items={[
          { label: "Total de clientes", display: stats.total, tone: "dark", weight: stats.total },
          { label: "Clientes ativos", display: stats.active, tone: "accent", weight: stats.active },
          {
            label: "MRR (mensalidades ativas)",
            display: formatCurrency(stats.mrr),
            tone: "hatch",
            weight: Math.max(stats.total, 1),
          },
        ]}
      />

      <FilterBar>
        <FilterSearch
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect icon={CircleDot} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="PAUSED">Pausado</option>
          <option value="CHURNED">Encerrado</option>
        </FilterSelect>
        <FilterSelect
          icon={ArrowUpDown}
          neutralValue="name"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="max-w-48"
        >
          <option value="name">Ordenar por nome</option>
          <option value="monthlyValue">Ordenar por mensalidade</option>
          <option value="startDate">Ordenar por mais recente</option>
        </FilterSelect>
        {(search || statusFilter) && (
          <FilterClearButton
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
          />
        )}
      </FilterBar>

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<Users size={20} />}
            title="Nenhum cliente cadastrado"
            description="Cadastre seu primeiro cliente para começar a gerenciar projetos e financeiro."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus size={14} /> Novo cliente
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filtered.map((client) => {
            const stats = client.postStats;
            const ClientIcon = clientIconFor(client.icon);
            return (
              <Card
                key={client.id}
                padding="none"
                className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="absolute top-5 right-5 z-10 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(client)}
                    className="text-white bg-black/30 hover:bg-black/50 p-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(client)}
                      className="text-white bg-black/30 hover:bg-danger p-1.5 rounded-full backdrop-blur-sm transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                <Link href={`/clientes/${client.id}`} className="block">
                  <div className="p-2.5 pb-0">
                    <div className="relative h-24 rounded-xl overflow-hidden">
                      <div
                        className="absolute inset-0"
                        style={{ background: resolveClientCoverColor(client.coverColor, client.id) }}
                      />
                    </div>
                  </div>

                  <div className="px-5 pb-5">
                    <div className="relative w-fit -mt-8 mb-3">
                      <Avatar
                        name={client.name}
                        url={client.avatarUrl}
                        size={64}
                        className="relative z-10 text-lg ring-4 ring-surface shadow-md"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 z-20 w-6 h-6 rounded-full bg-accent text-black flex items-center justify-center ring-2 ring-surface">
                        <ClientIcon size={12} />
                      </span>
                    </div>

                    <p className="text-base font-semibold text-ink truncate">{client.name}</p>

                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge tone={CLIENT_STATUS_TONE[client.status]} solid size="sm" pulse>
                        {CLIENT_STATUS_LABELS[client.status]}
                      </Badge>
                      <p className="text-[13px] text-muted truncate">
                        {client.contactName || client.email || `Desde ${formatDate(client.startDate)}`}
                      </p>
                    </div>

                    {client.services && client.services.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-3">
                        {client.services.slice(0, 2).map((service) => (
                          <span
                            key={service}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent/10 text-accent-light"
                          >
                            {service}
                          </span>
                        ))}
                        {client.services.length > 2 && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-muted flex-shrink-0">
                            +{client.services.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {client.passwordResetRequestedAt && (
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent bg-accent/10 rounded-full px-3 py-1.5 mt-3">
                        <AlertTriangle size={11} /> Pediu redefinição de senha
                      </p>
                    )}

                    <DottedDivider className="my-4" />

                    <div className="flex flex-col gap-2">
                      <DottedRow
                        label="Mensalidade"
                        value={
                          <>
                            <span className="tabular-nums">{formatCurrency(client.monthlyValue)}</span>
                            <span className="text-muted-2 font-normal">/mês</span>
                          </>
                        }
                      />
                      {client.health && (
                        <DottedRow
                          label="Saúde"
                          value={
                            <span
                              className="inline-flex items-center gap-1.5 font-semibold"
                              title={client.health.signals.length > 0 ? client.health.signals.join(" · ") : "Sem sinais de alerta"}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: healthColor(client.health.score) }} />
                              {client.health.score}
                            </span>
                          }
                        />
                      )}
                      {stats && (stats.pending + stats.approved + stats.changesRequested + stats.rejected > 0) && (
                        <>
                          <StatDotRow value={stats.pending} label="Pendente" color="var(--color-muted-2)" />
                          <StatDotRow value={stats.changesRequested} label="Ajuste" color="var(--color-accent)" />
                          <StatDotRow value={stats.approved} label="Aprovado" color="var(--color-success)" />
                          <StatDotRow value={stats.rejected} label="Reprovado" color="var(--color-danger)" />
                        </>
                      )}
                    </div>

                    {client.portalEnabled && client.portalSlug && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          copyPortalLink(client);
                        }}
                        className="inline-flex items-center gap-1.5 max-w-full text-[11px] font-semibold text-muted hover:text-accent bg-surface-2 rounded-full px-3 py-1.5 mt-4 cursor-pointer transition-colors"
                        title="Copiar link do portal"
                      >
                        {copiedLinkId === client.id ? (
                          <Check size={11} className="flex-shrink-0" />
                        ) : (
                          <Link2 size={11} className="flex-shrink-0" />
                        )}
                        <span className="truncate">/p/{client.portalSlug}</span>
                      </button>
                    )}
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar" : "Novo"}
        titleAccent="cliente"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-muted mb-2">Foto do cliente</p>
            <AvatarUploadField name={watchedName || "?"} value={avatarUrl} onChange={handleAvatarChange} />
          </div>

          <div>
            <p className="text-[13px] font-medium text-muted mb-2">Cor de capa</p>
            <div
              className="h-16 w-full rounded-[20px] transition-colors"
              style={{ background: resolveClientCoverColor(coverColor, editing?.id ?? "new") }}
            />
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {CLIENT_COVER_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => setCoverColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110",
                    coverColor === c && "ring-2 ring-offset-2 ring-offset-surface ring-ink",
                  )}
                  style={{ background: c }}
                />
              ))}
              <label
                title="Cor personalizada"
                className="relative w-7 h-7 rounded-full border border-dashed border-border-2 text-muted hover:text-accent hover:border-accent flex items-center justify-center cursor-pointer transition-colors"
              >
                <Plus size={13} />
                <input
                  type="color"
                  value={coverColor && /^#[0-9a-fA-F]{6}$/.test(coverColor) ? coverColor : "#000000"}
                  onChange={(e) => setCoverColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-medium text-muted mb-2">Ícone do segmento</p>
            <div className="flex flex-wrap gap-2">
              {CLIENT_ICONS.map(({ key, label, icon: IconComp }) => {
                const active = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => setIcon(active ? null : key)}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors",
                      active ? "text-black bg-accent" : "bg-surface-2 text-muted hover:text-ink",
                    )}
                  >
                    <IconComp size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          <Field label="Nome do cliente" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex: Loja Aurora" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Pessoa de contato">
              <Input {...register("contactName")} placeholder="Nome do contato" />
            </Field>
            <Field label="Telefone">
              <Input {...register("phone")} placeholder="(00) 00000-0000" />
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} placeholder="contato@cliente.com" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Documento (CNPJ/CPF)">
              <Input {...register("document")} placeholder="00.000.000/0000-00" />
            </Field>
            <Field label="Endereço">
              <Input {...register("address")} placeholder="Endereço do cliente" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Mensalidade (R$)" error={errors.monthlyValue?.message}>
              <Input type="number" step="0.01" min="0" {...register("monthlyValue")} />
            </Field>
            <Field label="Dia de cobrança">
              <Input type="number" min="1" max="28" {...register("billingDay")} />
            </Field>
            <Field label="Status">
              <Select {...register("status")}>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
                <option value="CHURNED">Encerrado</option>
              </Select>
            </Field>
          </div>

          <Field label="Cliente desde">
            <Input type="date" {...register("startDate")} />
          </Field>

          <Field label="Observações">
            <Textarea {...register("notes")} placeholder="Notas internas sobre o cliente..." />
          </Field>

          <DottedDivider />

          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
              <Checkbox {...register("portalEnabled")} />
              <KeyRound size={15} className="text-muted" /> Acesso ao Portal do Cliente
            </label>

            {Boolean(watchedPortalEnabled) && (
              <div className="flex flex-col gap-3 pl-1">
                <Field label="Email de acesso ao portal" error={errors.portalEmail?.message} hint="Login separado do email de contato acima">
                  <Input {...register("portalEmail")} placeholder="cliente@empresa.com" />
                </Field>

                <Field
                  label="Link personalizado do portal"
                  error={errors.portalSlug?.message}
                  hint="Gerado a partir do nome do cliente - pode editar se quiser"
                >
                  <div className="flex items-center rounded-full border border-border bg-surface-2 focus-within:border-accent overflow-hidden">
                    <span className="pl-4 py-2.5 text-sm text-muted-2 whitespace-nowrap">/p/</span>
                    <input
                      {...register("portalSlug")}
                      placeholder={slugify(watchedName || "empresa")}
                      className="flex-1 min-w-0 bg-transparent py-2.5 pr-3 text-sm text-ink outline-none placeholder:text-muted-2"
                    />
                    {editing?.portalSlug && (
                      <button
                        type="button"
                        onClick={() => copyPortalLink(editing)}
                        className="text-muted hover:text-accent px-2.5 self-stretch flex items-center hover:bg-surface transition-colors cursor-pointer"
                        title="Copiar link"
                      >
                        {copiedLinkId === editing.id ? <Check size={14} /> : <Link2 size={14} />}
                      </button>
                    )}
                  </div>
                </Field>

                <div className="flex flex-col gap-2">
                  {editing?.passwordResetRequestedAt && (
                    <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent bg-accent/10 rounded-2xl px-3 py-2">
                      <AlertTriangle size={13} /> Este cliente pediu para redefinir a senha do portal
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleGeneratePassword}
                    disabled={generatingPassword || submitting}
                  >
                    <KeyRound size={14} />
                    {generatingPassword || submitting
                      ? "Gerando..."
                      : editing
                        ? "Gerar nova senha"
                        : "Criar cliente e gerar senha"}
                  </Button>

                  {generatedPassword && (
                    <div className="bg-surface-2 rounded-2xl p-4 flex flex-col gap-2">
                      <p className="text-xs text-muted">
                        Senha gerada - copie e envie ao cliente, ela não será mostrada novamente:
                      </p>
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
                      {editing?.portalSlug && (
                        <p className="text-xs text-muted-2 truncate">
                          Link: {typeof window !== "undefined" ? window.location.origin : ""}/p/{editing.portalSlug}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
