"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles, Mail, QrCode, Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatDate } from "@/lib/format";
import {
  aiConfigSchema,
  type AiConfigInput,
  emailConfigSchema,
  type EmailConfigInput,
  paymentConfigSchema,
  type PaymentConfigInput,
  whatsAppConfigSchema,
  type WhatsAppConfigInput,
} from "@/lib/schemas";

type SaveMessage = { type: "success" | "error"; text: string } | null;

type AiStatus = { provider: string; hasKey: boolean; model: string | null; updatedAt: string | null };
type EmailStatus = { provider: string; hasKey: boolean; hasStoredKey: boolean; fromAddress: string | null; fromName: string | null; updatedAt: string | null };
type PaymentStatus = { provider: string; hasKey: boolean; hasWebhookToken: boolean; sandbox: boolean; updatedAt: string | null };
type WhatsAppStatus = { hasConfig: boolean; hasAppSecret: boolean; displayName: string | null; updatedAt: string | null; usingEnvFallback: boolean };

function ConfigCard({
  icon: Icon,
  title,
  description,
  hasKey,
  updatedAt,
  children,
  onSubmit,
  saving,
  message,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  hasKey: boolean;
  updatedAt: string | Date | null;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  message: SaveMessage;
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconChip tone="accent" size="lg">
          <Icon size={18} strokeWidth={1.8} />
        </IconChip>
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
        {hasKey && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success/10 rounded-full px-2.5 py-1 flex-shrink-0">
            <Check size={11} /> Configurado
          </span>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {children}

        {message && (
          <p className={`text-xs ${message.type === "success" ? "text-success" : "text-danger"}`}>{message.text}</p>
        )}
        {updatedAt && <p className="text-[11px] text-muted-2">Última atualização em {formatDate(updatedAt)}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} size="sm">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AiCard({ initialStatus }: { initialStatus: AiStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const { register, handleSubmit, reset } = useForm<AiConfigInput>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: { provider: (initialStatus.provider as AiConfigInput["provider"]) || "anthropic", apiKey: "", model: initialStatus.model ?? "" },
  });

  async function onSubmit(data: AiConfigInput) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/configuracoes/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: data.provider, apiKey: data.apiKey || undefined, model: data.model }),
      });
      const resData = await res.json();
      if (res.ok) {
        setStatus(resData);
        reset({ provider: resData.provider, apiKey: "", model: resData.model ?? "" });
        setMessage({ type: "success", text: "Credenciais de IA salvas." });
      } else {
        setMessage({ type: "error", text: resData.error ?? "Falha ao salvar" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigCard
      icon={Sparkles}
      title="IA"
      description="Rascunho de legenda com a voz de marca do cliente, via power-up."
      hasKey={status.hasKey}
      updatedAt={status.updatedAt}
      onSubmit={handleSubmit(onSubmit)}
      saving={saving}
      message={message}
    >
      <Field label="Provedor">
        <Select {...register("provider")}>
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI</option>
        </Select>
      </Field>
      <Field label="Chave de API" hint={status.hasKey ? "Deixe em branco pra manter a chave já salva" : undefined}>
        <Input type="password" {...register("apiKey")} placeholder="sk-..." />
      </Field>
      <Field label="Modelo (opcional)" hint="Deixe em branco pra usar o padrão do provedor">
        <Input {...register("model")} placeholder="claude-sonnet-5" />
      </Field>
    </ConfigCard>
  );
}

function EmailCard({ initialStatus }: { initialStatus: EmailStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const { register, handleSubmit, reset } = useForm<EmailConfigInput>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: { apiKey: "", fromAddress: initialStatus.fromAddress ?? "", fromName: initialStatus.fromName ?? "" },
  });

  async function onSubmit(data: EmailConfigInput) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/configuracoes/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "resend", apiKey: data.apiKey || undefined, fromAddress: data.fromAddress, fromName: data.fromName }),
      });
      const resData = await res.json();
      if (res.ok) {
        setStatus(resData);
        reset({ apiKey: "", fromAddress: resData.fromAddress ?? "", fromName: resData.fromName ?? "" });
        setMessage({ type: "success", text: "Credenciais de e-mail salvas." });
      } else {
        setMessage({ type: "error", text: resData.error ?? "Falha ao salvar" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigCard
      icon={Mail}
      title="E-mail transacional"
      description="Envio de proposta, avisos e notificações (via Resend)."
      hasKey={status.hasKey}
      updatedAt={status.updatedAt}
      onSubmit={handleSubmit(onSubmit)}
      saving={saving}
      message={message}
    >
      <Field label="Chave de API (Resend)" hint={status.hasStoredKey ? "Deixe em branco pra manter a chave já salva" : undefined}>
        <Input type="password" {...register("apiKey")} placeholder="re_..." />
      </Field>
      <Field label="E-mail remetente">
        <Input {...register("fromAddress")} placeholder="contato@suaagencia.com" />
      </Field>
      <Field label="Nome do remetente">
        <Input {...register("fromName")} placeholder="Sua Agência" />
      </Field>
    </ConfigCard>
  );
}

function PaymentCard({ initialStatus }: { initialStatus: PaymentStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const { register, handleSubmit, reset } = useForm<PaymentConfigInput>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: { apiKey: "", webhookToken: "", sandbox: initialStatus.sandbox },
  });

  async function onSubmit(data: PaymentConfigInput) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/configuracoes/pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "asaas", apiKey: data.apiKey || undefined, webhookToken: data.webhookToken || undefined, sandbox: data.sandbox }),
      });
      const resData = await res.json();
      if (res.ok) {
        setStatus(resData);
        reset({ apiKey: "", webhookToken: "", sandbox: resData.sandbox });
        setMessage({ type: "success", text: "Credenciais de cobrança salvas." });
      } else {
        setMessage({ type: "error", text: resData.error ?? "Falha ao salvar" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigCard
      icon={QrCode}
      title="Cobrança (PIX/boleto)"
      description="Gera cobrança real pros lançamentos do financeiro (via Asaas)."
      hasKey={status.hasKey}
      updatedAt={status.updatedAt}
      onSubmit={handleSubmit(onSubmit)}
      saving={saving}
      message={message}
    >
      <Field label="Chave de API (Asaas)" hint={status.hasKey ? "Deixe em branco pra manter a chave já salva" : undefined}>
        <Input type="password" {...register("apiKey")} placeholder="$aact_..." />
      </Field>
      <Field
        label="Token de autenticação do webhook"
        hint={
          status.hasWebhookToken
            ? "Deixe em branco pra manter o já salvo"
            : "Cadastre o mesmo token em Integrações → Webhooks no painel do Asaas - sem ele, os pagamentos não são confirmados automaticamente"
        }
      >
        <Input type="password" {...register("webhookToken")} placeholder="um-token-qualquer" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
        <Checkbox {...register("sandbox")} />
        Ambiente de testes (sandbox)
      </label>
    </ConfigCard>
  );
}

function WhatsAppCard({ initialStatus }: { initialStatus: WhatsAppStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<WhatsAppConfigInput>({
    resolver: zodResolver(whatsAppConfigSchema),
    defaultValues: { phoneNumberId: "", accessToken: "", verifyToken: "", appSecret: "", displayName: initialStatus.displayName ?? "" },
  });

  async function onSubmit(data: WhatsAppConfigInput) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/configuracoes/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: data.phoneNumberId,
          accessToken: data.accessToken || undefined,
          verifyToken: data.verifyToken || undefined,
          appSecret: data.appSecret || undefined,
          displayName: data.displayName,
        }),
      });
      const resData = await res.json();
      if (res.ok) {
        setStatus(resData);
        reset({ phoneNumberId: "", accessToken: "", verifyToken: "", appSecret: "", displayName: resData.displayName ?? "" });
        setMessage({ type: "success", text: "Credenciais do WhatsApp salvas." });
      } else {
        setMessage({ type: "error", text: resData.error ?? "Falha ao salvar" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigCard
      icon={MessageCircle}
      title="WhatsApp Business"
      description={
        status.usingEnvFallback && !status.hasConfig
          ? "Caixa de entrada real das conversas (Cloud API). Configurado hoje via variável de ambiente."
          : "Caixa de entrada real das conversas (Cloud API)."
      }
      hasKey={status.hasConfig && status.hasAppSecret}
      updatedAt={status.updatedAt}
      onSubmit={handleSubmit(onSubmit)}
      saving={saving}
      message={message}
    >
      <Field label="Phone Number ID" error={errors.phoneNumberId?.message}>
        <Input {...register("phoneNumberId")} placeholder="123456789012345" />
      </Field>
      <Field label="Access Token" hint={status.hasConfig ? "Deixe em branco pra manter o já salvo" : undefined}>
        <Input type="password" {...register("accessToken")} placeholder="EAAG..." />
      </Field>
      <Field label="Verify Token" hint="Definido por você, usado na verificação do webhook">
        <Input {...register("verifyToken")} placeholder="um-token-qualquer" />
      </Field>
      <Field
        label="App Secret (obrigatório)"
        hint={
          status.hasAppSecret
            ? "Deixe em branco pra manter o já salvo"
            : "Sem ele, o recebimento de mensagens fica desligado mesmo com o resto configurado"
        }
      >
        <Input type="password" {...register("appSecret")} placeholder="..." />
      </Field>
      <Field label="Nome de exibição (opcional)">
        <Input {...register("displayName")} placeholder="WhatsApp da agência" />
      </Field>
    </ConfigCard>
  );
}

export function ServicosPanel({
  initialAiStatus,
  initialEmailStatus,
  initialPaymentStatus,
  initialWhatsAppStatus,
}: {
  initialAiStatus: AiStatus;
  initialEmailStatus: EmailStatus;
  initialPaymentStatus: PaymentStatus;
  initialWhatsAppStatus: WhatsAppStatus;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <AiCard initialStatus={initialAiStatus} />
      <EmailCard initialStatus={initialEmailStatus} />
      <PaymentCard initialStatus={initialPaymentStatus} />
      <WhatsAppCard initialStatus={initialWhatsAppStatus} />
    </div>
  );
}
