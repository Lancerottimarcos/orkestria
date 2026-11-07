"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, Unlink, CheckCircle2, AlertTriangle, Loader2, ArrowUpRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { Badge } from "@/components/ui/Badge";
import { SocialIcon } from "@/components/kanban/SocialIcons";
import { SOCIAL_NETWORK_COLORS, SOCIAL_NETWORK_GRADIENTS, SOCIAL_NETWORK_LABELS, isMonoNetwork } from "@/lib/socialNetworks";
import type { SocialNetwork } from "@/components/kanban/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Account = {
  id: string;
  platform: SocialNetwork;
  name: string;
  status: "ACTIVE" | "EXPIRED" | "ERROR";
  lastError: string | null;
  tokenExpiresAt: string | null;
  connectedAt: string;
};

type PendingPage = { id: string; name: string; hasInstagram: boolean; instagramUsername: string | null };
type PendingOrg = { organizationId: string; name: string };

const PLATFORMS: { key: SocialNetwork; connectPath: string }[] = [
  { key: "INSTAGRAM", connectPath: "/api/integrations/meta/connect" },
  { key: "FACEBOOK", connectPath: "/api/integrations/meta/connect" },
  { key: "TIKTOK", connectPath: "/api/integrations/tiktok/connect" },
  { key: "YOUTUBE", connectPath: "/api/integrations/youtube/connect" },
  { key: "LINKEDIN", connectPath: "/api/integrations/linkedin/connect" },
  { key: "THREADS", connectPath: "/api/integrations/threads/connect" },
];

export function SocialAccountsPanel({ clientId }: { clientId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const metaStatus = searchParams.get("meta");
  const metaDetail = searchParams.get("metaDetail");
  const tikTokStatus = searchParams.get("tiktok");
  const tikTokDetail = searchParams.get("tiktokDetail");
  const youTubeStatus = searchParams.get("youtube");
  const youTubeDetail = searchParams.get("youtubeDetail");
  const linkedInStatus = searchParams.get("linkedin");
  const linkedInDetail = searchParams.get("linkedinDetail");
  const threadsStatus = searchParams.get("threads");
  const threadsDetail = searchParams.get("threadsDetail");

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [pendingPages, setPendingPages] = useState<PendingPage[] | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<PendingOrg[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  const { confirmDialog } = useConfirmDialog();

  async function loadAccounts() {
    const res = await fetch(`/api/integrations/meta/accounts?clientId=${clientId}`);
    if (res.ok) setAccounts(await res.json());
  }

  useEffect(() => {
    fetch(`/api/integrations/meta/accounts?clientId=${clientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setAccounts(data));
  }, [clientId]);

  useEffect(() => {
    if (metaStatus !== "pick") return;
    fetch(`/api/integrations/meta/pending?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setPendingPages(d.pages ?? []));
  }, [metaStatus, clientId]);

  useEffect(() => {
    if (linkedInStatus !== "pick") return;
    fetch(`/api/integrations/linkedin/pending?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d) => setPendingOrgs(d.orgs ?? []));
  }, [linkedInStatus, clientId]);

  async function choosePage(pageId: string) {
    setChoosing(true);
    try {
      await fetch("/api/integrations/meta/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, pageId }),
      });
      setPendingPages(null);
      router.replace(`/clientes/${clientId}`);
      await loadAccounts();
    } finally {
      setChoosing(false);
    }
  }

  async function chooseOrg(organizationId: string) {
    setChoosing(true);
    try {
      await fetch("/api/integrations/linkedin/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, organizationId }),
      });
      setPendingOrgs(null);
      router.replace(`/clientes/${clientId}`);
      await loadAccounts();
    } finally {
      setChoosing(false);
    }
  }

  async function disconnect(id: string) {
    if (!(await confirmDialog("Desconectar esta conta? Os agendamentos automáticos pra ela param de funcionar.", { tone: "danger", confirmLabel: "Desconectar" }))) return;
    await fetch(`/api/integrations/meta/accounts/${id}`, { method: "DELETE" });
    loadAccounts();
  }

  return (
    <Card padding="lg" className="flex flex-col gap-5 mb-5">
      <div className="flex items-center gap-3">
        <IconChip tone="accent" size="sm">
          <Link2 size={15} strokeWidth={2} />
        </IconChip>
        <div>
          <h2 className="text-base font-semibold text-ink">Integrações</h2>
          <p className="text-xs text-muted mt-0.5">Conecte Instagram, Facebook, TikTok, YouTube, LinkedIn e Threads pra publicar os agendamentos direto na conta do cliente.</p>
        </div>
      </div>

      {metaStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-2xl px-4 py-3">
          <CheckCircle2 size={15} className="flex-shrink-0" /> Conta conectada com sucesso.
        </div>
      )}
      {metaStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {metaDetail || "Não foi possível conectar."}
        </div>
      )}
      {tikTokStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-2xl px-4 py-3">
          <CheckCircle2 size={15} className="flex-shrink-0" /> Conta do TikTok conectada com sucesso.
        </div>
      )}
      {tikTokStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {tikTokDetail || "Não foi possível conectar."}
        </div>
      )}
      {youTubeStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-2xl px-4 py-3">
          <CheckCircle2 size={15} className="flex-shrink-0" /> Canal do YouTube conectado com sucesso.
        </div>
      )}
      {youTubeStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {youTubeDetail || "Não foi possível conectar."}
        </div>
      )}
      {linkedInStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-2xl px-4 py-3">
          <CheckCircle2 size={15} className="flex-shrink-0" /> Company Page do LinkedIn conectada com sucesso.
        </div>
      )}
      {linkedInStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {linkedInDetail || "Não foi possível conectar."}
        </div>
      )}
      {threadsStatus === "connected" && (
        <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-2xl px-4 py-3">
          <CheckCircle2 size={15} className="flex-shrink-0" /> Perfil do Threads conectado com sucesso.
        </div>
      )}
      {threadsStatus === "error" && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">
          <AlertTriangle size={15} className="flex-shrink-0" /> {threadsDetail || "Não foi possível conectar."}
        </div>
      )}

      {pendingOrgs && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-muted">
            {pendingOrgs.length === 0
              ? "Não encontrei mais Company Pages pendentes de escolha."
              : "Essa conta administra mais de uma Company Page. Qual delas é deste cliente?"}
          </p>
          {pendingOrgs.map((org) => (
            <button
              key={org.organizationId}
              type="button"
              disabled={choosing}
              onClick={() => chooseOrg(org.organizationId)}
              className="flex items-center gap-3 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors px-4 py-3 text-left cursor-pointer disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{org.name}</p>
              </div>
              {choosing ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> : null}
            </button>
          ))}
        </div>
      )}

      {pendingPages && (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-muted">
            {pendingPages.length === 0
              ? "Não encontrei mais Páginas pendentes de escolha."
              : "Essa conta administra mais de uma Página. Qual delas é deste cliente?"}
          </p>
          {pendingPages.map((page) => (
            <button
              key={page.id}
              type="button"
              disabled={choosing}
              onClick={() => choosePage(page.id)}
              className="flex items-center gap-3 rounded-2xl bg-surface-2 hover:bg-surface-3 transition-colors px-4 py-3 text-left cursor-pointer disabled:opacity-50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">{page.name}</p>
                <p className="text-xs text-muted-2 truncate">
                  {page.hasInstagram ? `Instagram vinculado: @${page.instagramUsername}` : "Sem Instagram vinculado"}
                </p>
              </div>
              {choosing ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> : null}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {PLATFORMS.map(({ key, connectPath }) => {
          const account = accounts?.find((a) => a.platform === key);
          const connected = Boolean(account);
          const isActive = connected && account!.status === "ACTIVE";
          // TikTok e Threads não usam cor de marca no ícone - a identidade
          // oficial deles em contexto monocromático é preto no claro e
          // branco no escuro, não um selo colorido como Instagram/Facebook.
          const isMono = isMonoNetwork(key);
          const color = SOCIAL_NETWORK_COLORS[key];
          const badgeBackground = SOCIAL_NETWORK_GRADIENTS[key] ?? color;
          return (
            <div
              key={key}
              className="relative rounded-3xl p-5 flex flex-col gap-4 border-[1.5px] transition-colors"
              style={{
                borderColor: isActive
                  ? "var(--color-success)"
                  : connected && !isMono
                    ? `color-mix(in srgb, ${color} 40%, transparent)`
                    : "var(--color-border-2)",
                background:
                  connected && !isMono ? `color-mix(in srgb, ${color} 7%, var(--color-surface))` : "var(--color-surface-2)",
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-black/10",
                    isMono ? "bg-ink text-bg" : "text-white",
                  )}
                  style={isMono ? undefined : { background: badgeBackground }}
                >
                  <SocialIcon network={key} size={22} />
                </span>
                {isActive && <Badge tone="success">Conectada</Badge>}
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{SOCIAL_NETWORK_LABELS[key]}</p>
                {account ? (
                  <p
                    className={cn(
                      "text-xs mt-1 leading-snug",
                      account.status === "ACTIVE" ? "text-muted" : "text-danger",
                    )}
                  >
                    {account.status === "ACTIVE"
                      ? `${account.name} · desde ${formatDate(account.connectedAt)}`
                      : account.lastError || "Conexão expirada, reconecte"}
                  </p>
                ) : (
                  <p className="text-xs text-muted-2 mt-1">Nenhuma conta conectada</p>
                )}
              </div>

              {account ? (
                <div className="mt-auto flex items-center gap-2">
                  <a
                    href={`${connectPath}?clientId=${clientId}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors bg-surface text-muted hover:text-accent hover:bg-accent/10 text-xs px-3.5 py-2.5 cursor-pointer"
                  >
                    <RefreshCw size={13} /> Reconectar
                  </a>
                  <button
                    type="button"
                    onClick={() => disconnect(account.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors bg-surface text-muted hover:text-danger hover:bg-danger/10 text-xs px-3.5 py-2.5 cursor-pointer"
                  >
                    <Unlink size={13} /> Desconectar
                  </button>
                </div>
              ) : (
                <a
                  href={`${connectPath}?clientId=${clientId}`}
                  className={cn(
                    "mt-auto inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors text-xs px-3.5 py-2.5 cursor-pointer hover:opacity-90",
                    isMono ? "bg-ink text-bg" : "text-white",
                  )}
                  style={isMono ? undefined : { background: badgeBackground }}
                >
                  Conectar <ArrowUpRight size={13} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
