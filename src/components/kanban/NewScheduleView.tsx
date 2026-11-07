"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarClock, Link2, Sparkles, Users, Type, ImagePlus, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AttachmentsField, type AttachmentDraft } from "@/components/attachments/AttachmentsField";
import { InlineDatePicker } from "./InlineDatePicker";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { PostPreview } from "./SchedulePostModal";
import { SocialIcon } from "./SocialIcons";
import {
  SOCIAL_NETWORKS,
  SOCIAL_NETWORK_LABELS,
  isMonoNetwork,
  networkShapeBackground,
} from "@/lib/socialNetworks";
import { cn } from "@/lib/cn";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { SocialNetwork } from "./types";

type ConnectedAccount = { platform: SocialNetwork; status: "ACTIVE" | "EXPIRED" | "ERROR" };

const CAPTION_LIMIT = 2200;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toHHMM(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** A API pode devolver uma string simples ou o objeto flatten() do zod - nunca some o motivo real num erro genérico. */
function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const fieldErrors = (error as { fieldErrors?: Record<string, string[]> }).fieldErrors;
    const messages = fieldErrors ? Object.values(fieldErrors).flat().filter(Boolean) : [];
    if (messages.length > 0) return messages.join(" ");
  }
  return "Falha ao criar o agendamento";
}

/** O card do Kanban exige um título - quando o usuário só preenche a legenda, usamos a primeira linha dela como título interno. */
function deriveTitleFromDescription(description: string) {
  const firstLine = description.trim().split("\n")[0]?.trim() ?? "";
  if (!firstLine) return "Publicação";
  return firstLine.length > 60 ? `${firstLine.slice(0, 60).trim()}…` : firstLine;
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const QUICK_TIMES = ["08:00", "09:00", "12:00", "15:00", "18:00", "20:00"];

/** "Hoje" / "Amanhã" / "quinta-feira, 21 de agosto" a partir dos campos de data/hora escolhidos. */
function friendlyWhen(date: string, time: string) {
  if (!date) return null;
  const target = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  const todayISO = toISODate(today);
  const tomorrowISO = toISODate(addDays(today, 1));
  const dayLabel = date === todayISO ? "Hoje" : date === tomorrowISO ? "Amanhã" : `${WEEKDAYS[target.getDay()]}, ${target.getDate()} de ${target.toLocaleDateString("pt-BR", { month: "long" })}`;
  return time ? `${dayLabel} às ${time}` : dayLabel;
}

export function NewScheduleView({
  clients,
}: {
  clients: { id: string; name: string; avatarUrl: string | null }[];
}) {
  const router = useRouter();
  const { alertDialog } = useConfirmDialog();
  const searchParams = useSearchParams();
  const now = new Date();

  // Vindo do botão "Agendar no X" de uma coluna do quadro de Agendamentos -
  // pré-seleciona essa rede assim que o cliente escolhido tiver ela conectada.
  const preselectNetworkParam = searchParams.get("network");
  const preselectNetwork = SOCIAL_NETWORKS.some((n) => n.key === preselectNetworkParam)
    ? (preselectNetworkParam as SocialNetwork)
    : null;

  const [clientId, setClientId] = useState("");
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [network, setNetwork] = useState<SocialNetwork | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [date, setDate] = useState(toISODate(now));
  const [time, setTime] = useState("09:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/integrations/meta/accounts?clientId=${clientId}`)
      .then((res) => res.json())
      .then((data: ConnectedAccount[]) => {
        setAccounts(data);
        if (preselectNetwork && data.some((a) => a.platform === preselectNetwork && a.status === "ACTIVE")) {
          setNetwork(preselectNetwork);
        }
      })
      .catch(() => setAccounts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function handleClientChange(id: string) {
    setClientId(id);
    setAccounts([]);
    setNetwork(null);
  }

  function applyShortcut(target: Date) {
    setDate(toISODate(target));
    setTime(toHHMM(target));
  }

  const connectedNetworks = SOCIAL_NETWORKS.filter((n) =>
    accounts.some((a) => a.platform === n.key && a.status === "ACTIVE"),
  );

  const selectedClient = clients.find((c) => c.id === clientId);
  const canSubmit = Boolean(
    clientId && (title.trim().length >= 2 || description.trim().length >= 2) && network && date && time,
  );
  const when = friendlyWhen(date, time);

  async function handleSubmit() {
    if (!canSubmit || !network) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/kanban/cards/quick-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: title.trim() || deriveTitleFromDescription(description),
          description: description.trim() || undefined,
          attachments: attachments.map((a) => ({ url: a.url, type: a.type, name: a.name ?? undefined })),
          network,
          // new Date(`${date}T${time}`) sem sufixo de fuso é interpretado
          // pelo NAVEGADOR no fuso do usuário - já manda em ISO/UTC pro
          // servidor pra não depender do fuso da VPS (UTC) reinterpretar a
          // mesma string local como se fosse outro horário.
          scheduledAt: new Date(`${date}T${time}`).toISOString(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(extractErrorMessage(data?.error));
      }
      if (res.status === 207) {
        await alertDialog(
          "Agendamento criado, mas esse cliente não tem essa rede conectada de verdade agora - fica salvo como lembrete, ninguém vai publicar sozinho no horário marcado.",
        );
      }
      router.push("/agendamentos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar o agendamento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Link
        href="/agendamentos"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Voltar para Agendamentos
      </Link>

      <PageHeader
        title="Novo agendamento"
        description="Prepare o post e escolha quando ele vai pro ar, sem passar pelo quadro de demandas."
        actions={
          <>
            <Button variant="ghost" onClick={() => router.push("/agendamentos")}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              <CalendarClock size={15} />
              {submitting ? "Agendando..." : network ? `Agendar no ${SOCIAL_NETWORK_LABELS[network]}` : "Confirmar agendamento"}
            </Button>
          </>
        }
      />

      {error && <p className="text-sm text-danger bg-danger/10 rounded-2xl px-4 py-3 mb-6">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="flex flex-col gap-6">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <IconChip tone="accent" size="sm">
                <Users size={15} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-ink">Cliente e rede</h2>
            </div>

            <Field label="Cliente">
              <Select value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                <option value="">Selecione um cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
                ))}
              </Select>
            </Field>

            {clientId && connectedNetworks.length === 0 && (
              <div className="flex items-center gap-2.5 text-sm text-muted bg-surface-2 rounded-2xl px-4 py-3">
                <Link2 size={15} className="flex-shrink-0" />
                <span>
                  Nenhuma rede conectada pra esse cliente.{" "}
                  <Link href={`/clientes/${clientId}`} className="text-accent hover:underline font-medium">
                    Conectar rede social
                  </Link>
                </span>
              </div>
            )}

            {connectedNetworks.length > 0 && (
              <Field label="Rede social">
                <div className="flex gap-2">
                  {connectedNetworks.map((n) => {
                    const mono = isMonoNetwork(n.key);
                    const selected = network === n.key;
                    return (
                      <button
                        key={n.key}
                        type="button"
                        onClick={() => setNetwork(n.key)}
                        className={cn(
                          "flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border transition-colors cursor-pointer",
                          selected
                            ? cn("border-transparent", mono ? "bg-ink text-bg" : "text-white")
                            : "border-border-2 text-muted hover:border-accent hover:text-ink",
                        )}
                        style={selected && !mono ? { background: networkShapeBackground(n.key) ?? undefined } : undefined}
                      >
                        <span
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center",
                            selected ? (mono ? "bg-bg/20 text-bg" : "bg-white/20 text-white") : "bg-surface-2 text-ink",
                          )}
                        >
                          <SocialIcon network={n.key} size={17} />
                        </span>
                        <span className="text-xs font-semibold">{n.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          </Card>

          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <IconChip tone="accent" size="sm">
                <Type size={15} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-ink">Conteúdo</h2>
            </div>

            <Field label="Título (opcional)" hint="Se deixar em branco, usamos o começo da legenda como título interno.">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Post de lançamento" />
            </Field>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between pl-1.5 pr-0.5">
                <label className="text-[13px] font-medium text-muted">Legenda</label>
                <EmojiPickerButton textareaRef={descriptionRef} value={description} onChange={setDescription} />
              </div>
              <Textarea
                ref={descriptionRef}
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, CAPTION_LIMIT))}
                placeholder="Texto que vai junto com o post"
                rows={5}
              />
              <p className="text-[11px] text-muted-2 mt-0.5 text-right tabular-nums">
                {description.length}/{CAPTION_LIMIT}
              </p>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <IconChip tone="accent" size="sm">
                <ImagePlus size={15} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-ink">Mídia</h2>
            </div>
            <AttachmentsField attachments={attachments} onChange={setAttachments} allowFiles={false} />
          </Card>

          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <IconChip tone="accent" size="sm">
                <Clock size={15} strokeWidth={2} />
              </IconChip>
              <h2 className="text-base font-semibold text-ink">Quando publicar</h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Daqui a 1 hora", target: new Date(now.getTime() + 60 * 60 * 1000) },
                { label: "Hoje às 18h", target: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0) },
                { label: "Amanhã às 9h", target: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0) },
                { label: "Amanhã às 18h", target: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0) },
              ].map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applyShortcut(s.target)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full bg-surface-2 text-muted hover:bg-accent/10 hover:text-accent transition-colors cursor-pointer"
                >
                  <Sparkles size={11} /> {s.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
              <Field label="Data">
                <InlineDatePicker value={date} onChange={setDate} />
              </Field>
              <Field label="Horário">
                <div className="flex flex-col gap-2">
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="text-center text-base font-semibold tabular-nums" />
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TIMES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTime(t)}
                        className={cn(
                          "text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors cursor-pointer",
                          time === t ? "bg-accent text-black" : "bg-surface-2 text-muted hover:bg-accent/10 hover:text-accent",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <PostPreview
            card={{
              id: "draft",
              title: title || "Prévia da publicação",
              description,
              client: selectedClient ? { name: selectedClient.name, avatarUrl: selectedClient.avatarUrl } : null,
              attachments: attachments.map((a) => ({ id: a.id, url: a.url, type: a.type, name: a.name ?? null })),
            }}
            network={network}
          />

          <Card padding="lg" className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-2">Resumo</h3>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">Cliente</span>
              <span className="font-semibold text-ink truncate max-w-[60%] text-right">
                {selectedClient?.name ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">Rede</span>
              {network ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                    isMonoNetwork(network) ? "bg-ink text-bg" : "text-white",
                  )}
                  style={isMonoNetwork(network) ? undefined : { background: networkShapeBackground(network) ?? undefined }}
                >
                  <SocialIcon network={network} size={11} /> {SOCIAL_NETWORK_LABELS[network]}
                </span>
              ) : (
                <span className="font-semibold text-ink">-</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted">Quando</span>
              <span className="font-semibold text-ink text-right">{when ?? "-"}</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
