"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Loader2, CheckCircle2, XCircle, ArrowRight, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/PageHeader";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { TrelloIcon, ClickUpIcon, NotionIcon, AsanaIcon } from "./PlatformIcons";

type PlatformKey = "trello" | "clickup" | "notion" | "asana";
type PlatformDef = {
  key: PlatformKey;
  label: string;
  Icon: typeof TrelloIcon;
  color: string;
  tokenLabel: string;
  tokenHint: string;
  tokenPlaceholder: string;
  helpUrl: string;
  helpLabel: string;
};

const PLATFORMS: PlatformDef[] = [
  {
    key: "trello",
    label: "Trello",
    Icon: TrelloIcon,
    color: "#0052CC",
    tokenLabel: "Key e Token",
    tokenHint:
      "Cole sua Key e Token juntos, separados por dois-pontos. Gere os dois em trello.com/app-key - a própria página tem um link \"Token\" que gera o token pessoal na hora.",
    tokenPlaceholder: "sua-key:seu-token",
    helpUrl: "https://trello.com/app-key",
    helpLabel: "Abrir trello.com/app-key",
  },
  {
    key: "clickup",
    label: "ClickUp",
    Icon: ClickUpIcon,
    color: "#7B68EE",
    tokenLabel: "Personal API Token",
    tokenHint: "Gere em Configurações → Apps → Personal API Token (nunca expira).",
    tokenPlaceholder: "pk_...",
    helpUrl: "https://app.clickup.com/settings/apps",
    helpLabel: "Abrir configurações do ClickUp",
  },
  {
    key: "notion",
    label: "Notion",
    Icon: NotionIcon,
    color: "#000000",
    tokenLabel: "Internal Integration Token",
    tokenHint:
      "Crie uma integração interna em notion.so/my-integrations, copie o token e compartilhe cada database que quer importar com ela (⋯ no topo do database → Conectar a → sua integração) - senão ela não aparece na lista.",
    tokenPlaceholder: "ntn_...",
    helpUrl: "https://www.notion.so/my-integrations",
    helpLabel: "Abrir notion.so/my-integrations",
  },
  {
    key: "asana",
    label: "Asana",
    Icon: AsanaIcon,
    color: "#F06A6A",
    tokenLabel: "Personal Access Token",
    tokenHint: "Gere em Configurações do perfil → Apps → Gerenciar Tokens de Acesso Pessoal.",
    tokenPlaceholder: "1/...",
    helpUrl: "https://app.asana.com/0/my-apps",
    helpLabel: "Abrir configurações do Asana",
  },
];

type BoardSummary = { id: string; name: string };
type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type ImportJobRow = {
  id: string;
  platform: string;
  status: JobStatus;
  sourceBoardName: string;
  totalCards: number;
  importedCards: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  targetBoard: { id: string; name: string };
  client: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
};

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Pendente",
  RUNNING: "Importando",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
};
const STATUS_TONE: Record<JobStatus, "success" | "danger" | "muted"> = {
  PENDING: "muted",
  RUNNING: "muted",
  COMPLETED: "success",
  FAILED: "danger",
};

export function ImportarPanel({
  clients,
  initialJobs,
}: {
  clients: { id: string; name: string; avatarUrl: string | null }[];
  initialJobs: ImportJobRow[];
}) {
  const [openPlatform, setOpenPlatform] = useState<PlatformKey | null>(null);
  const [jobs, setJobs] = useState(initialJobs);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLATFORMS.map((p) => (
          <button key={p.key} type="button" onClick={() => setOpenPlatform(p.key)} className="text-left cursor-pointer">
            <Card padding="lg" className="flex flex-col gap-3 h-full hover:shadow-md hover:-translate-y-0.5 transition-all">
              <span
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shadow-black/10"
                style={{ background: p.color }}
              >
                <p.Icon size={20} />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-ink">{p.label}</h3>
                <p className="text-xs text-muted mt-0.5">Importar demandas e anexos</p>
              </div>
            </Card>
          </button>
        ))}
      </div>

      {openPlatform && (
        <ImportWizard
          platform={PLATFORMS.find((p) => p.key === openPlatform)!}
          clients={clients}
          onClose={() => setOpenPlatform(null)}
          onJobCreated={(job) => setJobs((prev) => [job, ...prev])}
          onJobUpdated={(job) => setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)))}
        />
      )}

      <div>
        <h2 className="text-base font-semibold text-ink mb-4">Importações recentes</h2>
        {jobs.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<Download size={20} strokeWidth={1.8} />}
              title="Nenhuma importação ainda"
              description="Escolha uma plataforma acima pra trazer demandas e anexos de outra ferramenta pro Orkestrya."
            />
          </Card>
        ) : (
          <Table>
            <Thead>
              <Th>Origem</Th>
              <Th>Quadro criado</Th>
              <Th>Cliente</Th>
              <Th>Status</Th>
              <Th>Progresso</Th>
              <Th>Quando</Th>
            </Thead>
            <tbody>
              {jobs.map((j) => {
                const platformDef = PLATFORMS.find((p) => p.key === j.platform.toLowerCase());
                return (
                  <Tr key={j.id}>
                    <Td className="text-ink font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {platformDef && <platformDef.Icon size={13} className="text-muted flex-shrink-0" />}
                        {platformDef?.label ?? j.platform} · {j.sourceBoardName}
                      </span>
                    </Td>
                    <Td>
                      <Link href="/kanban" className="text-accent hover:underline">
                        {j.targetBoard.name}
                      </Link>
                    </Td>
                    <Td className="text-muted">{j.client?.name ?? "-"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[j.status]}>
                        {j.status === "FAILED" && j.errorMessage ? j.errorMessage : STATUS_LABEL[j.status]}
                      </Badge>
                    </Td>
                    <Td className="text-muted">
                      {j.importedCards}/{j.totalCards}
                    </Td>
                    <Td className="text-muted">{formatDateTime(j.createdAt)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

type WizardStep = "token" | "boards" | "progress";

function ImportWizard({
  platform,
  clients,
  onClose,
  onJobCreated,
  onJobUpdated,
}: {
  platform: PlatformDef;
  clients: { id: string; name: string; avatarUrl: string | null }[];
  onClose: () => void;
  onJobCreated: (job: ImportJobRow) => void;
  onJobUpdated: (job: ImportJobRow) => void;
}) {
  const [step, setStep] = useState<WizardStep>("token");
  const [token, setToken] = useState("");
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [sourceBoardId, setSourceBoardId] = useState("");
  const [targetBoardName, setTargetBoardName] = useState("");
  const [clientId, setClientId] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ status: JobStatus; importedCards: number; totalCards: number; errorMessage?: string } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
  }, []);

  async function handleFetchBoards() {
    if (!token.trim()) {
      setError("Cole o token antes de continuar.");
      return;
    }
    setLoadingBoards(true);
    setError(null);
    try {
      const res = await fetch(`/api/importar/${platform.key}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível buscar os quadros");
      if (!Array.isArray(data) || data.length === 0) throw new Error("Nenhum quadro encontrado pra esse token");
      setBoards(data);
      setSourceBoardId(data[0].id);
      setTargetBoardName(data[0].name);
      setStep("boards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível buscar os quadros");
    } finally {
      setLoadingBoards(false);
    }
  }

  async function handleStart() {
    const sourceBoard = boards.find((b) => b.id === sourceBoardId);
    if (!sourceBoard) return;
    if (!targetBoardName.trim()) {
      setError("Informe o nome do quadro de destino.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/importar/${platform.key}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token.trim(),
          sourceBoardId: sourceBoard.id,
          sourceBoardName: sourceBoard.name,
          targetBoardName: targetBoardName.trim(),
          clientId: clientId || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Não foi possível iniciar a importação");
      setJobId(data.id);
      setProgress({ status: "RUNNING", importedCards: 0, totalCards: data.totalCards });
      onJobCreated({
        id: data.id,
        platform: platform.key.toUpperCase(),
        status: data.totalCards > 0 ? "RUNNING" : "COMPLETED",
        sourceBoardName: sourceBoard.name,
        totalCards: data.totalCards,
        importedCards: 0,
        errorMessage: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
        targetBoard: { id: data.targetBoardId, name: targetBoardName.trim() },
        client: clients.find((c) => c.id === clientId) ?? null,
        createdBy: { id: "", name: "" },
      });
      setStep("progress");
      if (data.totalCards > 0) runContinue(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível iniciar a importação");
    } finally {
      setStarting(false);
    }
  }

  async function runContinue(id: string) {
    try {
      const res = await fetch(`/api/importar/jobs/${id}/continue`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao processar importação");
      setProgress(data);
      onJobUpdated({
        id,
        platform: platform.key.toUpperCase(),
        status: data.status,
        sourceBoardName: boards.find((b) => b.id === sourceBoardId)?.name ?? "",
        totalCards: data.totalCards,
        importedCards: data.importedCards,
        errorMessage: data.errorMessage ?? null,
        createdAt: new Date().toISOString(),
        completedAt: data.status === "COMPLETED" ? new Date().toISOString() : null,
        targetBoard: { id: "", name: targetBoardName.trim() },
        client: clients.find((c) => c.id === clientId) ?? null,
        createdBy: { id: "", name: "" },
      });
      if (data.status === "RUNNING") {
        pollTimer.current = setTimeout(() => runContinue(id), 400);
      }
    } catch (err) {
      setProgress((prev) => (prev ? { ...prev, status: "FAILED", errorMessage: err instanceof Error ? err.message : "Falha ao processar importação" } : prev));
    }
  }

  const percent = progress && progress.totalCards > 0 ? Math.round((progress.importedCards / progress.totalCards) * 100) : 0;

  return (
    <Modal open onClose={onClose} title="Importar do" titleAccent={platform.label} width="md">
      {step === "token" && (
        <div className="flex flex-col gap-4">
          <Field label={platform.tokenLabel} hint={platform.tokenHint}>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={platform.tokenPlaceholder}
              autoFocus
            />
          </Field>
          {error && <p className="text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">{error}</p>}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <a
              href={platform.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors"
            >
              {platform.helpLabel} <ExternalLink size={12} />
            </a>
            <Button onClick={handleFetchBoards} disabled={loadingBoards}>
              {loadingBoards ? <Loader2 size={15} className="animate-spin" /> : <>Buscar quadros <ArrowRight size={14} /></>}
            </Button>
          </div>
        </div>
      )}

      {step === "boards" && (
        <div className="flex flex-col gap-4">
          <Field label="Quadro de origem">
            <Select
              value={sourceBoardId}
              onChange={(e) => {
                setSourceBoardId(e.target.value);
                const board = boards.find((b) => b.id === e.target.value);
                if (board) setTargetBoardName(board.name);
              }}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome do quadro no Orkestrya">
            <Input value={targetBoardName} onChange={(e) => setTargetBoardName(e.target.value)} />
          </Field>
          <Field label="Cliente (opcional)" hint="Associa o quadro e as demandas importadas a um cliente">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Nenhum</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {error && <p className="text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep("token")}>
              Voltar
            </Button>
            <Button onClick={handleStart} disabled={starting}>
              {starting ? <Loader2 size={15} className="animate-spin" /> : "Iniciar importação"}
            </Button>
          </div>
        </div>
      )}

      {step === "progress" && progress && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", progress.status === "FAILED" ? "bg-danger" : "bg-accent")}
                style={{ width: `${progress.status === "COMPLETED" ? 100 : percent}%` }}
              />
            </div>
            <p className="text-xs text-muted">
              {progress.importedCards} de {progress.totalCards} demandas importadas
            </p>
          </div>

          {progress.status === "RUNNING" && (
            <p className="text-sm text-muted flex items-center gap-2">
              <Loader2 size={15} className="animate-spin" /> Importando, não feche esta janela...
            </p>
          )}
          {progress.status === "COMPLETED" && (
            <p className="text-sm text-success bg-success/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 size={16} /> Importação concluída - as demandas já estão no quadro &ldquo;{targetBoardName}&rdquo;.
            </p>
          )}
          {progress.status === "FAILED" && (
            <p className="text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <XCircle size={16} /> {progress.errorMessage ?? "Falha ao importar"}
            </p>
          )}

          <div className="flex items-center justify-end gap-3">
            {(progress.status === "COMPLETED" || progress.status === "FAILED") && jobId && (
              <Link href="/kanban" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline mr-auto">
                Ver quadro <ArrowRight size={12} />
              </Link>
            )}
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
