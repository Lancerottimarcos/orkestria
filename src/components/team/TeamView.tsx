"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, UserCog, CircleDot } from "lucide-react";
import { teamMemberSchema, type TeamMemberInput, type TeamMemberFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { StatPillRow } from "@/components/ui/StatPills";
import { DottedDivider } from "@/components/ui/Dotted";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { formatCurrency } from "@/lib/format";
import { TEAM_TYPE_LABELS, PAYMENT_TYPE_LABELS } from "@/lib/labels";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type MemberRow = {
  id: string;
  name: string;
  type: "EMPLOYEE" | "PARTNER";
  role: string | null;
  email: string | null;
  phone: string | null;
  paymentType: "FIXED_MONTHLY" | "PER_PROJECT" | "HOURLY";
  monthlyValue: number | null;
  active: boolean;
  avatarUrl: string | null;
  _count?: { squadMemberships: number; leadOfSquads: number };
};

export function TeamView({
  initialMembers,
  isAdmin,
}: {
  initialMembers: MemberRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const { confirmDialog } = useConfirmDialog();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TeamMemberFormValues, unknown, TeamMemberInput>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: { type: "EMPLOYEE", paymentType: "FIXED_MONTHLY", active: true },
  });

  function openCreate() {
    setEditing(null);
    setAvatarUrl(null);
    reset({
      name: "",
      type: "EMPLOYEE",
      role: "",
      email: "",
      phone: "",
      paymentType: "FIXED_MONTHLY",
      monthlyValue: undefined,
      active: true,
    });
    setModalOpen(true);
  }

  function openEdit(member: MemberRow) {
    setEditing(member);
    setAvatarUrl(member.avatarUrl);
    reset({
      name: member.name,
      type: member.type,
      role: member.role ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      paymentType: member.paymentType,
      monthlyValue: member.monthlyValue ?? undefined,
      active: member.active,
    });
    setModalOpen(true);
  }

  async function onSubmit(data: TeamMemberInput) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/equipe/${editing.id}` : "/api/equipe";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, avatarUrl: avatarUrl ?? "" }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      setModalOpen(false);
      const updated = await fetch("/api/equipe").then((r) => r.json());
      setMembers(updated);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(member: MemberRow) {
    const leads = member._count?.leadOfSquads ?? 0;
    const inSquads = member._count?.squadMemberships ?? 0;
    let message = `Remover "${member.name}"?`;
    if (leads > 0 && inSquads > 0) {
      message = `Remover "${member.name}"? A pessoa lidera ${leads} squad(s) - que ficarão sem líder - e participa de ${inSquads} squad(s) no total.`;
    } else if (leads > 0) {
      message = `Remover "${member.name}"? A pessoa lidera ${leads} squad(s), que ficarão sem líder.`;
    } else if (inSquads > 0) {
      message = `Remover "${member.name}"? A pessoa será removida de ${inSquads} squad(s) que participa.`;
    }
    if (!(await confirmDialog(message, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/equipe/${member.id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      router.refresh();
    }
  }

  const stats = useMemo(() => {
    const active = members.filter((m) => m.active);
    const payroll = active
      .filter((m) => m.paymentType === "FIXED_MONTHLY")
      .reduce((sum, m) => sum + (m.monthlyValue ?? 0), 0);
    return {
      total: members.length,
      active: active.length,
      payroll,
    };
  }, [members]);

  const filtered = useMemo(() => {
    return members
      .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
      .filter((m) => !typeFilter || m.type === typeFilter)
      .filter((m) => !activeFilter || (activeFilter === "active" ? m.active : !m.active));
  }, [members, search, typeFilter, activeFilter]);

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Funcionários e parceiros da agência"
        actions={
          isAdmin && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Novo membro
            </Button>
          )
        }
      />

      <StatPillRow
        className="mb-8"
        items={[
          { label: "Total de membros", display: stats.total, tone: "dark", weight: stats.total },
          { label: "Ativos", display: stats.active, tone: "accent", weight: stats.active },
          ...(isAdmin
            ? [
                {
                  label: "Folha mensal fixa",
                  display: formatCurrency(stats.payroll),
                  tone: "hatch" as const,
                  weight: Math.max(stats.total, 1),
                },
              ]
            : []),
        ]}
      />

      {members.length > 0 && (
        <FilterBar>
          <FilterSearch
            placeholder="Buscar membro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FilterSelect icon={UserCog} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-44">
            <option value="">Todos os tipos</option>
            <option value="EMPLOYEE">Funcionário</option>
            <option value="PARTNER">Parceiro</option>
          </FilterSelect>
          <FilterSelect icon={CircleDot} value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)} className="max-w-40">
            <option value="">Todo status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </FilterSelect>
          {(search || typeFilter || activeFilter) && (
            <FilterClearButton
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setActiveFilter("");
              }}
            />
          )}
        </FilterBar>
      )}

      {filtered.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<UserCog size={20} strokeWidth={1.8} />}
            title={members.length === 0 ? "Nenhum membro cadastrado" : "Nenhum membro encontrado"}
            description={
              members.length === 0
                ? "Cadastre funcionários e parceiros da agência."
                : "Tente ajustar a busca ou os filtros."
            }
            action={
              members.length === 0 &&
              isAdmin && (
                <Button size="sm" onClick={openCreate}>
                  <Plus size={14} /> Novo membro
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Table>
          <Thead>
            <Th>Nome</Th>
            <Th>Tipo</Th>
            <Th>Função</Th>
            <Th>Pagamento</Th>
            <Th>Status</Th>
            {isAdmin && <Th className="text-right">Ações</Th>}
          </Thead>
          <tbody>
            {filtered.map((member) => (
              <Tr key={member.id} className="group">
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} url={member.avatarUrl} size={38} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">{member.name}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">{member.email || member.phone || ""}</p>
                    </div>
                  </div>
                </Td>
                <Td className="text-ink">{TEAM_TYPE_LABELS[member.type]}</Td>
                <Td className="text-muted">{member.role || "-"}</Td>
                <Td className="text-ink">
                  {PAYMENT_TYPE_LABELS[member.paymentType]}
                  {isAdmin && member.monthlyValue != null && (
                    <span className="text-muted tabular-nums whitespace-nowrap"> · {formatCurrency(member.monthlyValue)}</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={member.active ? "success" : "muted"}>
                    {member.active ? "Ativo" : "Inativo"}
                  </Badge>
                </Td>
                {isAdmin && (
                  <Td>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(member)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {isAdmin && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editing ? "Editar" : "Novo"}
          titleAccent="membro"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <AvatarUploadField name={watch("name") || "?"} value={avatarUrl} onChange={setAvatarUrl} />

            <Field label="Nome" error={errors.name?.message}>
              <Input {...register("name")} placeholder="Nome completo" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <Select {...register("type")}>
                  <option value="EMPLOYEE">Funcionário</option>
                  <option value="PARTNER">Parceiro</option>
                </Select>
              </Field>
              <Field label="Função">
                <Input {...register("role")} placeholder="Ex: Designer" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <Input {...register("email")} placeholder="email@exemplo.com" />
              </Field>
              <Field label="Telefone">
                <Input {...register("phone")} placeholder="(00) 00000-0000" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Forma de pagamento">
                <Select {...register("paymentType")}>
                  <option value="FIXED_MONTHLY">Mensal fixo</option>
                  <option value="PER_PROJECT">Por projeto</option>
                  <option value="HOURLY">Por hora</option>
                </Select>
              </Field>
              <Field label="Valor mensal (R$)">
                <Input type="number" step="0.01" min="0" {...register("monthlyValue")} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <Checkbox {...register("active")} />
              Ativo
            </label>

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
        </Modal>
      )}
    </div>
  );
}
