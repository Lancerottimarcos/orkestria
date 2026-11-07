"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, Copy, Check, Unlink, ExternalLink, Share2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Field, Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/PageHeader";
import { SocialIcon, MetaIcon } from "@/components/kanban/SocialIcons";
import { SOCIAL_NETWORK_LABELS, SOCIAL_NETWORK_COLORS, SOCIAL_NETWORK_GRADIENTS, isMonoNetwork } from "@/lib/socialNetworks";
import { formatDate } from "@/lib/format";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

const META_BRAND_COLOR = "#0866FF";

type NetworkId = "META" | "TIKTOK" | "YOUTUBE" | "LINKEDIN" | "THREADS";

type MetaStatus = { appId: string | null; hasSecret: boolean; redirectUri: string; updatedAt: string | Date | null };
type TikTokStatus = { clientKey: string | null; hasSecret: boolean; redirectUri: string; updatedAt: string | Date | null };
type YouTubeStatus = { clientId: string | null; hasSecret: boolean; redirectUri: string; updatedAt: string | Date | null };
type LinkedInStatus = { clientId: string | null; hasSecret: boolean; redirectUri: string; updatedAt: string | Date | null };
type ThreadsStatus = { appId: string | null; hasSecret: boolean; redirectUri: string; updatedAt: string | Date | null };

type AccountRow = {
  id: string;
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "YOUTUBE" | "LINKEDIN" | "THREADS";
  name: string;
  status: "ACTIVE" | "EXPIRED" | "ERROR";
  lastError: string | null;
  tokenExpiresAt: string | null;
  connectedAt: string;
  client: { id: string; name: string };
};

const STATUS_TONE: Record<AccountRow["status"], "success" | "danger" | "muted"> = {
  ACTIVE: "success",
  EXPIRED: "danger",
  ERROR: "danger",
};

const STATUS_LABEL: Record<AccountRow["status"], string> = {
  ACTIVE: "Ativa",
  EXPIRED: "Expirada",
  ERROR: "Erro",
};

/** Ícone circular colorido de cada rede, reaproveitado tanto no card compacto quanto no cabeçalho do modal. */
function NetworkIcon({ id, size = 22 }: { id: NetworkId; size?: number }) {
  const dim = size + 20;
  if (id === "META") {
    return (
      <span
        className="rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-black/10"
        style={{ background: META_BRAND_COLOR, width: dim, height: dim }}
      >
        <MetaIcon size={size} />
      </span>
    );
  }
  if (id === "TIKTOK" || id === "THREADS") {
    return (
      <span
        className="rounded-2xl flex items-center justify-center bg-ink text-bg flex-shrink-0 shadow-sm shadow-black/10"
        style={{ width: dim, height: dim }}
      >
        <SocialIcon network={id} size={size} />
      </span>
    );
  }
  return (
    <span
      className="rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-black/10"
      style={{ background: SOCIAL_NETWORK_COLORS[id], width: dim, height: dim }}
    >
      <SocialIcon network={id} size={size} />
    </span>
  );
}

function RedirectField({ label, hint, value, copied, onCopy }: { label: string; hint: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input value={value} readOnly className="text-muted" />
        <button
          type="button"
          onClick={onCopy}
          title="Copiar"
          className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-muted hover:text-accent transition-colors cursor-pointer"
        >
          {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
        </button>
      </div>
    </Field>
  );
}

function SaveMessage({ message }: { message: { type: "success" | "error"; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={cn("text-sm rounded-2xl px-4 py-3", message.type === "success" ? "text-success bg-success/10" : "text-danger bg-danger/10")}>
      {message.text}
    </p>
  );
}

function ModalFooter({ href, hostLabel, onSave, saving }: { href: string; hostLabel: string; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors"
      >
        Abrir {hostLabel} <ExternalLink size={12} />
      </a>
      <Button onClick={onSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar credenciais"}
      </Button>
    </div>
  );
}

export function IntegracoesPanel({
  initialMetaStatus,
  initialTikTokStatus,
  initialYouTubeStatus,
  initialLinkedInStatus,
  initialThreadsStatus,
  initialAccounts,
}: {
  initialMetaStatus: MetaStatus;
  initialTikTokStatus: TikTokStatus;
  initialYouTubeStatus: YouTubeStatus;
  initialLinkedInStatus: LinkedInStatus;
  initialThreadsStatus: ThreadsStatus;
  initialAccounts: AccountRow[];
}) {
  const [metaStatus, setMetaStatus] = useState(initialMetaStatus);
  const { confirmDialog } = useConfirmDialog();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [appId, setAppId] = useState(initialMetaStatus.appId ?? "");
  const [appSecret, setAppSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [tikTokStatus, setTikTokStatus] = useState(initialTikTokStatus);
  const [clientKey, setClientKey] = useState(initialTikTokStatus.clientKey ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [savingTikTok, setSavingTikTok] = useState(false);
  const [saveMessageTikTok, setSaveMessageTikTok] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedTikTok, setCopiedTikTok] = useState(false);

  const [youTubeStatus, setYouTubeStatus] = useState(initialYouTubeStatus);
  const [ytClientId, setYtClientId] = useState(initialYouTubeStatus.clientId ?? "");
  const [ytClientSecret, setYtClientSecret] = useState("");
  const [savingYouTube, setSavingYouTube] = useState(false);
  const [saveMessageYouTube, setSaveMessageYouTube] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedYouTube, setCopiedYouTube] = useState(false);

  const [linkedInStatus, setLinkedInStatus] = useState(initialLinkedInStatus);
  const [liClientId, setLiClientId] = useState(initialLinkedInStatus.clientId ?? "");
  const [liClientSecret, setLiClientSecret] = useState("");
  const [savingLinkedIn, setSavingLinkedIn] = useState(false);
  const [saveMessageLinkedIn, setSaveMessageLinkedIn] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);

  const [threadsStatus, setThreadsStatus] = useState(initialThreadsStatus);
  const [thAppId, setThAppId] = useState(initialThreadsStatus.appId ?? "");
  const [thAppSecret, setThAppSecret] = useState("");
  const [savingThreads, setSavingThreads] = useState(false);
  const [saveMessageThreads, setSaveMessageThreads] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedThreads, setCopiedThreads] = useState(false);

  const [activeNetwork, setActiveNetwork] = useState<NetworkId | null>(null);

  const isConfigured = Boolean(metaStatus.appId && metaStatus.hasSecret);
  const isTikTokConfigured = Boolean(tikTokStatus.clientKey && tikTokStatus.hasSecret);
  const isYouTubeConfigured = Boolean(youTubeStatus.clientId && youTubeStatus.hasSecret);
  const isLinkedInConfigured = Boolean(linkedInStatus.clientId && linkedInStatus.hasSecret);
  const isThreadsConfigured = Boolean(threadsStatus.appId && threadsStatus.hasSecret);

  async function handleSave() {
    if (!appId.trim()) {
      setSaveMessage({ type: "error", text: "Informe o App ID." });
      return;
    }
    if (!metaStatus.hasSecret && !appSecret.trim()) {
      setSaveMessage({ type: "error", text: "Informe a Chave secreta na primeira configuração." });
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/integrations/meta/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: appId.trim(), appSecret: appSecret.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Falha ao salvar (servidor não respondeu)");
      setMetaStatus(data);
      setAppSecret("");
      setSaveMessage({ type: "success", text: "Configuração salva." });
    } catch (err) {
      setSaveMessage({ type: "error", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyRedirect() {
    await copyToClipboard(metaStatus.redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleSaveTikTok() {
    if (!clientKey.trim()) {
      setSaveMessageTikTok({ type: "error", text: "Informe o Client Key." });
      return;
    }
    if (!tikTokStatus.hasSecret && !clientSecret.trim()) {
      setSaveMessageTikTok({ type: "error", text: "Informe a Chave secreta na primeira configuração." });
      return;
    }
    setSavingTikTok(true);
    setSaveMessageTikTok(null);
    try {
      const res = await fetch("/api/integrations/tiktok/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientKey: clientKey.trim(), clientSecret: clientSecret.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Falha ao salvar (servidor não respondeu)");
      setTikTokStatus(data);
      setClientSecret("");
      setSaveMessageTikTok({ type: "success", text: "Configuração salva." });
    } catch (err) {
      setSaveMessageTikTok({ type: "error", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSavingTikTok(false);
    }
  }

  async function handleCopyTikTokRedirect() {
    await copyToClipboard(tikTokStatus.redirectUri);
    setCopiedTikTok(true);
    setTimeout(() => setCopiedTikTok(false), 1800);
  }

  async function handleSaveYouTube() {
    if (!ytClientId.trim()) {
      setSaveMessageYouTube({ type: "error", text: "Informe o Client ID." });
      return;
    }
    if (!youTubeStatus.hasSecret && !ytClientSecret.trim()) {
      setSaveMessageYouTube({ type: "error", text: "Informe a Chave secreta na primeira configuração." });
      return;
    }
    setSavingYouTube(true);
    setSaveMessageYouTube(null);
    try {
      const res = await fetch("/api/integrations/youtube/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: ytClientId.trim(), clientSecret: ytClientSecret.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Falha ao salvar (servidor não respondeu)");
      setYouTubeStatus(data);
      setYtClientSecret("");
      setSaveMessageYouTube({ type: "success", text: "Configuração salva." });
    } catch (err) {
      setSaveMessageYouTube({ type: "error", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSavingYouTube(false);
    }
  }

  async function handleCopyYouTubeRedirect() {
    await copyToClipboard(youTubeStatus.redirectUri);
    setCopiedYouTube(true);
    setTimeout(() => setCopiedYouTube(false), 1800);
  }

  async function handleSaveLinkedIn() {
    if (!liClientId.trim()) {
      setSaveMessageLinkedIn({ type: "error", text: "Informe o Client ID." });
      return;
    }
    if (!linkedInStatus.hasSecret && !liClientSecret.trim()) {
      setSaveMessageLinkedIn({ type: "error", text: "Informe a Chave secreta na primeira configuração." });
      return;
    }
    setSavingLinkedIn(true);
    setSaveMessageLinkedIn(null);
    try {
      const res = await fetch("/api/integrations/linkedin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: liClientId.trim(), clientSecret: liClientSecret.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Falha ao salvar (servidor não respondeu)");
      setLinkedInStatus(data);
      setLiClientSecret("");
      setSaveMessageLinkedIn({ type: "success", text: "Configuração salva." });
    } catch (err) {
      setSaveMessageLinkedIn({ type: "error", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSavingLinkedIn(false);
    }
  }

  async function handleCopyLinkedInRedirect() {
    await copyToClipboard(linkedInStatus.redirectUri);
    setCopiedLinkedIn(true);
    setTimeout(() => setCopiedLinkedIn(false), 1800);
  }

  async function handleSaveThreads() {
    if (!thAppId.trim()) {
      setSaveMessageThreads({ type: "error", text: "Informe o App ID." });
      return;
    }
    if (!threadsStatus.hasSecret && !thAppSecret.trim()) {
      setSaveMessageThreads({ type: "error", text: "Informe a Chave secreta na primeira configuração." });
      return;
    }
    setSavingThreads(true);
    setSaveMessageThreads(null);
    try {
      const res = await fetch("/api/integrations/threads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: thAppId.trim(), appSecret: thAppSecret.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error ?? "Falha ao salvar (servidor não respondeu)");
      setThreadsStatus(data);
      setThAppSecret("");
      setSaveMessageThreads({ type: "success", text: "Configuração salva." });
    } catch (err) {
      setSaveMessageThreads({ type: "error", text: err instanceof Error ? err.message : "Falha ao salvar" });
    } finally {
      setSavingThreads(false);
    }
  }

  async function handleCopyThreadsRedirect() {
    await copyToClipboard(threadsStatus.redirectUri);
    setCopiedThreads(true);
    setTimeout(() => setCopiedThreads(false), 1800);
  }

  async function handleDisconnect(accountId: string) {
    if (!(await confirmDialog("Desconectar esta conta? Os agendamentos automáticos pra ela param de funcionar.", { tone: "danger", confirmLabel: "Desconectar" }))) return;
    await fetch(`/api/integrations/meta/accounts/${accountId}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
  }

  const networks: { id: NetworkId; label: string; sublabel: string; configured: boolean }[] = [
    { id: "META", label: "Meta", sublabel: "Instagram e Facebook", configured: isConfigured },
    { id: "TIKTOK", label: "TikTok", sublabel: "Vídeos verticais", configured: isTikTokConfigured },
    { id: "YOUTUBE", label: "YouTube", sublabel: "Vídeos e Shorts", configured: isYouTubeConfigured },
    { id: "LINKEDIN", label: "LinkedIn", sublabel: "Company Page", configured: isLinkedInConfigured },
    { id: "THREADS", label: "Threads", sublabel: "Texto e conversas", configured: isThreadsConfigured },
  ];
  const activeInfo = networks.find((n) => n.id === activeNetwork) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <IconChip size="sm">
            <Share2 size={14} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Redes sociais</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {networks.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActiveNetwork(n.id)}
              className="bg-surface rounded-card shadow-sm shadow-black/5 p-5 flex flex-col items-center gap-3 text-center hover:shadow-md hover:shadow-black/10 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <NetworkIcon id={n.id} />
              <div className="min-w-0 w-full">
                <p className="text-sm font-semibold text-ink truncate">{n.label}</p>
                <p className="text-[11px] text-muted truncate mt-0.5">{n.sublabel}</p>
              </div>
              <Badge tone={n.configured ? "success" : "muted"} size="sm">
                {n.configured ? "Configurado" : "Não configurado"}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <Modal open={activeNetwork !== null} onClose={() => setActiveNetwork(null)} title={activeInfo?.label ?? ""} width="lg">
        {activeNetwork === "META" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted leading-relaxed">
              Credenciais do app criado em developers.facebook.com. Usadas pra conectar a conta de cada cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="App ID">
                <Input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="Ex: 1234567890123456" />
              </Field>
              <Field
                label="Chave secreta do app"
                hint={metaStatus.hasSecret ? "Já configurada - deixe em branco pra manter a atual" : undefined}
              >
                <Input
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder={metaStatus.hasSecret ? "•••••••••••••••••" : "Cole a chave secreta aqui"}
                />
              </Field>
            </div>

            <RedirectField
              label="URI de redirecionamento OAuth"
              hint="Cole exatamente esse valor nas configurações do app na Meta"
              value={metaStatus.redirectUri}
              copied={copied}
              onCopy={handleCopyRedirect}
            />

            <SaveMessage message={saveMessage} />
            <ModalFooter href="https://developers.facebook.com/apps" hostLabel="developers.facebook.com" onSave={handleSave} saving={saving} />
          </div>
        )}

        {activeNetwork === "TIKTOK" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted leading-relaxed">
              Credenciais do app criado em developers.tiktok.com (produto “Content Posting API”). Usadas pra conectar a conta de cada cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Client Key">
                <Input value={clientKey} onChange={(e) => setClientKey(e.target.value)} placeholder="Ex: aw1a2b3c4d5e6f7g" />
              </Field>
              <Field
                label="Chave secreta do app (Client Secret)"
                hint={tikTokStatus.hasSecret ? "Já configurada - deixe em branco pra manter a atual" : undefined}
              >
                <Input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={tikTokStatus.hasSecret ? "•••••••••••••••••" : "Cole a chave secreta aqui"}
                />
              </Field>
            </div>

            <RedirectField
              label="URI de redirecionamento OAuth"
              hint="Cole exatamente esse valor em Login Kit → Redirect URI, nas configurações do app no TikTok"
              value={tikTokStatus.redirectUri}
              copied={copiedTikTok}
              onCopy={handleCopyTikTokRedirect}
            />

            <p className="text-xs text-muted leading-relaxed">
              Publicar como público exige que o app passe pela auditoria do TikTok para o escopo{" "}
              <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">video.publish</code>. Sem auditoria aprovada,
              tudo que for publicado por aqui fica restrito a “somente eu” na conta conectada.
            </p>

            <SaveMessage message={saveMessageTikTok} />
            <ModalFooter href="https://developers.tiktok.com/apps" hostLabel="developers.tiktok.com" onSave={handleSaveTikTok} saving={savingTikTok} />
          </div>
        )}

        {activeNetwork === "YOUTUBE" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted leading-relaxed">
              Credenciais do projeto criado no Google Cloud Console (YouTube Data API v3). Usadas pra conectar o canal de cada cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Client ID">
                <Input value={ytClientId} onChange={(e) => setYtClientId(e.target.value)} placeholder="Ex: 123456789-abc.apps.googleusercontent.com" />
              </Field>
              <Field
                label="Chave secreta do app (Client Secret)"
                hint={youTubeStatus.hasSecret ? "Já configurada - deixe em branco pra manter a atual" : undefined}
              >
                <Input
                  type="password"
                  value={ytClientSecret}
                  onChange={(e) => setYtClientSecret(e.target.value)}
                  placeholder={youTubeStatus.hasSecret ? "•••••••••••••••••" : "Cole a chave secreta aqui"}
                />
              </Field>
            </div>

            <RedirectField
              label="URI de redirecionamento OAuth"
              hint="Cole exatamente esse valor nas Credenciais OAuth 2.0 do projeto, no Google Cloud Console"
              value={youTubeStatus.redirectUri}
              copied={copiedYouTube}
              onCopy={handleCopyYouTubeRedirect}
            />

            <p className="text-xs text-muted leading-relaxed">
              O YouTube agenda nativamente: o vídeo já sobe como &ldquo;privado&rdquo; com a publicação marcada, e o próprio
              YouTube libera como público na hora certa. Só aceita vídeo (sem imagem/carrossel).
            </p>

            <SaveMessage message={saveMessageYouTube} />
            <ModalFooter href="https://console.cloud.google.com/apis/credentials" hostLabel="console.cloud.google.com" onSave={handleSaveYouTube} saving={savingYouTube} />
          </div>
        )}

        {activeNetwork === "LINKEDIN" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted leading-relaxed">
              Credenciais do app criado em developers.linkedin.com (produto “Community Management API”). Usadas pra conectar a Company Page de cada cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Client ID">
                <Input value={liClientId} onChange={(e) => setLiClientId(e.target.value)} placeholder="Ex: 86abc1de2fghij" />
              </Field>
              <Field
                label="Chave secreta do app (Client Secret)"
                hint={linkedInStatus.hasSecret ? "Já configurada - deixe em branco pra manter a atual" : undefined}
              >
                <Input
                  type="password"
                  value={liClientSecret}
                  onChange={(e) => setLiClientSecret(e.target.value)}
                  placeholder={linkedInStatus.hasSecret ? "•••••••••••••••••" : "Cole a chave secreta aqui"}
                />
              </Field>
            </div>

            <RedirectField
              label="URI de redirecionamento OAuth"
              hint="Cole exatamente esse valor em Auth → Redirect URLs, nas configurações do app no LinkedIn"
              value={linkedInStatus.redirectUri}
              copied={copiedLinkedIn}
              onCopy={handleCopyLinkedInRedirect}
            />

            <p className="text-xs text-muted leading-relaxed">
              Publicar na Company Page do cliente exige que o app tenha aprovação da LinkedIn pro produto{" "}
              <code className="text-[11px] bg-surface-2 px-1.5 py-0.5 rounded">Community Management API</code> (processo manual,
              não é self-serve). O LinkedIn também não tem agendamento nativo (quem publica na hora certa é o worker) e o
              token de acesso dura 60 dias fixos - sem renovação automática, é preciso reconectar a conta quando vencer.
            </p>

            <SaveMessage message={saveMessageLinkedIn} />
            <ModalFooter href="https://www.linkedin.com/developers/apps" hostLabel="developers.linkedin.com" onSave={handleSaveLinkedIn} saving={savingLinkedIn} />
          </div>
        )}

        {activeNetwork === "THREADS" && (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-muted leading-relaxed">
              Credenciais do Threads use case configurado dentro do app da Meta (developers.facebook.com). Usadas pra conectar o perfil de cada cliente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="App ID">
                <Input value={thAppId} onChange={(e) => setThAppId(e.target.value)} placeholder="Ex: 1234567890123456" />
              </Field>
              <Field
                label="Chave secreta do app (App Secret)"
                hint={threadsStatus.hasSecret ? "Já configurada - deixe em branco pra manter a atual" : undefined}
              >
                <Input
                  type="password"
                  value={thAppSecret}
                  onChange={(e) => setThAppSecret(e.target.value)}
                  placeholder={threadsStatus.hasSecret ? "•••••••••••••••••" : "Cole a chave secreta aqui"}
                />
              </Field>
            </div>

            <RedirectField
              label="URI de redirecionamento OAuth"
              hint="Cole exatamente esse valor nas configurações do Threads use case, no painel do app da Meta"
              value={threadsStatus.redirectUri}
              copied={copiedThreads}
              onCopy={handleCopyThreadsRedirect}
            />

            <p className="text-xs text-muted leading-relaxed">
              O Threads também não tem agendamento nativo (quem publica na hora certa é o worker). O App ID/Secret são
              diferentes dos usados na integração com Instagram/Facebook, mesmo estando dentro do mesmo app da Meta -
              use os valores do &ldquo;Threads use case&rdquo;, não os do Facebook Login.
            </p>

            <SaveMessage message={saveMessageThreads} />
            <ModalFooter href="https://developers.facebook.com/apps" hostLabel="developers.facebook.com" onSave={handleSaveThreads} saving={savingThreads} />
          </div>
        )}
      </Modal>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <IconChip size="sm">
            <Link2 size={15} strokeWidth={2} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Contas conectadas ({accounts.length})</h2>
        </div>

        {accounts.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Link2 size={20} strokeWidth={1.8} />}
              title="Nenhuma conta conectada ainda"
              description="Conecte o Instagram, Facebook, TikTok, YouTube, LinkedIn ou Threads de um cliente pela página dele em Clientes → Integrações."
            />
          </Card>
        ) : (
          <Table>
            <Thead>
              <Th>Cliente</Th>
              <Th>Rede</Th>
              <Th>Conta</Th>
              <Th>Status</Th>
              <Th>Conectado em</Th>
              <Th className="text-right">Ações</Th>
            </Thead>
            <tbody>
              {accounts.map((account) => (
                <Tr key={account.id}>
                  <Td>
                    <Link href={`/clientes/${account.client.id}`} className="font-semibold text-ink hover:text-accent transition-colors">
                      {account.client.name}
                    </Link>
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                        isMonoNetwork(account.platform) ? "bg-ink text-bg" : "text-white",
                      )}
                      style={
                        isMonoNetwork(account.platform)
                          ? undefined
                          : { background: SOCIAL_NETWORK_GRADIENTS[account.platform] ?? SOCIAL_NETWORK_COLORS[account.platform] }
                      }
                    >
                      <SocialIcon network={account.platform} size={12} />
                      {SOCIAL_NETWORK_LABELS[account.platform]}
                    </span>
                  </Td>
                  <Td className="text-ink">{account.name}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[account.status]}>
                      {account.status === "ACTIVE" ? STATUS_LABEL.ACTIVE : account.lastError || STATUS_LABEL[account.status]}
                    </Badge>
                  </Td>
                  <Td className="text-muted">{formatDate(account.connectedAt)}</Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      title="Desconectar"
                      className="p-2 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <Unlink size={14} />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
