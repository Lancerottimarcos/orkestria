"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserCircle, Building2, Mail, Phone, MapPin, IdCard, QrCode } from "lucide-react";
import { meSchema, companySettingsSchema, type MeInput, type CompanySettingsInput } from "@/lib/schemas";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { PageHeader } from "@/components/ui/PageHeader";
import { AvatarUploadField } from "@/components/ui/AvatarUploadField";
import { Avatar } from "@/components/ui/Avatar";
import { Card, Panel } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider, DottedRow } from "@/components/ui/Dotted";

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserCircle;
  children: React.ReactNode;
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <IconChip tone="accent">
          <Icon size={18} strokeWidth={1.8} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
      </div>
      <DottedDivider />
      {children}
    </Card>
  );
}

function ProfileForm({ user }: { user: { name: string; email: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const { update } = useSession();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MeInput>({
    resolver: zodResolver(meSchema),
    defaultValues: { name: user.name, email: user.email, currentPassword: "", newPassword: "" },
  });
  const watchedNewPassword = watch("newPassword");

  async function onSubmit(data: MeInput) {
    setSubmitting(true);
    setFormError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, avatarUrl: avatarUrl ?? "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.formErrors?.[0] ?? "Falha ao salvar perfil");
        return;
      }
      await update({ name: json.name, email: json.email });
      reset({ name: json.name, email: json.email, currentPassword: "", newPassword: "" });
      setAvatarUrl(json.avatarUrl ?? null);
      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AvatarUploadField name={user.name} value={avatarUrl} onChange={setAvatarUrl} />
      <Field label="Nome" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Seu nome" />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input {...register("email")} placeholder="seu@email.com" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Senha atual" hint="Necessária só para trocar a senha">
          <PasswordInput {...register("currentPassword")} placeholder="••••••••" />
        </Field>
        <Field label="Nova senha (opcional)" error={errors.newPassword?.message}>
          <PasswordInput {...register("newPassword")} placeholder="••••••••" />
        </Field>
      </div>
      <PasswordStrength value={watchedNewPassword ?? ""} />
      {formError && <p className="text-xs text-danger">{formError}</p>}
      {success && !formError && <p className="text-xs text-success">Perfil atualizado com sucesso.</p>}
      <DottedDivider className="mt-1" />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}

function CompanyForm({ company }: { company: CompanySettingsInput }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(company.logoUrl || null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: company,
  });

  async function onSubmit(data: CompanySettingsInput) {
    setSubmitting(true);
    setFormError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/configuracoes/empresa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, logoUrl: logoUrl ?? "" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error?.formErrors?.[0] ?? "Falha ao salvar dados da empresa");
        return;
      }
      reset(data);
      setLogoUrl(json.logoUrl ?? null);
      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <AvatarUploadField name={company.name || "Agência"} value={logoUrl} onChange={setLogoUrl} />
      <Field label="Nome da empresa" error={errors.name?.message}>
        <Input {...register("name")} placeholder="Nome da agência" />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input {...register("email")} placeholder="contato@agencia.com" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Telefone">
          <Input {...register("phone")} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Documento (CNPJ)">
          <Input {...register("document")} placeholder="00.000.000/0000-00" />
        </Field>
      </div>
      <Field label="Endereço">
        <Input {...register("address")} placeholder="Endereço da agência" />
      </Field>
      <Field label="Chave PIX" hint="Aparece no contrato como a chave que recebe os pagamentos">
        <Input {...register("pixKey")} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
      </Field>
      <Field label="Cor de destaque do sistema" error={errors.primaryColor?.message} hint="Troca a cor de destaque (laranja) usada em botões e chips no sistema inteiro">
        <div className="flex items-center gap-2.5">
          <input
            type="color"
            {...register("primaryColor")}
            defaultValue={company.primaryColor || "#ff9f1c"}
            className="w-10 h-10 rounded-lg border border-border-2 cursor-pointer bg-transparent"
          />
          <Input {...register("primaryColor")} placeholder="#ff9f1c" className="flex-1" />
        </div>
      </Field>
      {formError && <p className="text-xs text-danger">{formError}</p>}
      {success && !formError && <p className="text-xs text-success">Dados da empresa atualizados com sucesso.</p>}
      <DottedDivider className="mt-1" />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar empresa"}
        </Button>
      </div>
    </form>
  );
}

export function ConfiguracoesView({
  user,
  isAdmin,
  company,
}: {
  user: { name: string; email: string; avatarUrl: string | null };
  isAdmin: boolean;
  company: CompanySettingsInput | null;
}) {
  return (
    <div>
      <PageHeader title="Configurações" description="Perfil e dados da empresa" />
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Panel padding="lg" className="flex flex-col items-center text-center gap-5">
            <Avatar
              name={user.name}
              url={user.avatarUrl}
              size={96}
              className="ring-4 ring-panel-2 text-2xl"
            />
            <div>
              <p className="text-[24px] font-light tracking-tight leading-tight text-panel-ink">
                {user.name}
              </p>
              <p className="text-sm text-panel-muted mt-1.5">{user.email}</p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-panel-ink bg-panel-2 rounded-full px-4 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              {isAdmin ? "Administrador" : "Membro"}
            </span>
          </Panel>

          <SectionCard title="Ficha da conta" icon={IdCard}>
            <div className="flex flex-col gap-3">
              <DottedRow label="Nome" value={user.name} icon={<UserCircle size={14} />} />
              <DottedRow label="Email" value={<span className="break-all">{user.email}</span>} icon={<Mail size={14} />} />
            </div>
            {isAdmin && company && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-medium text-muted">Empresa</p>
                <DottedRow label="Nome" value={company.name || "-"} icon={<Building2 size={14} />} />
                <DottedRow
                  label="Email"
                  value={<span className="break-all">{company.email || "-"}</span>}
                  icon={<Mail size={14} />}
                />
                <DottedRow label="Telefone" value={company.phone || "-"} icon={<Phone size={14} />} />
                <DottedRow label="Documento" value={company.document || "-"} icon={<IdCard size={14} />} />
                <DottedRow
                  label="Chave PIX"
                  value={<span className="break-all">{company.pixKey || "-"}</span>}
                  icon={<QrCode size={14} />}
                />
                <DottedRow
                  label="Endereço"
                  value={<span className="break-words">{company.address || "-"}</span>}
                  icon={<MapPin size={14} />}
                />
              </div>
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard title="Meu perfil" icon={UserCircle}>
            <ProfileForm user={user} />
          </SectionCard>
          {isAdmin && company && (
            <SectionCard title="Dados da empresa" icon={Building2}>
              <CompanyForm company={company} />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}
