"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MessageSquareWarning,
  XCircle,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card, Panel } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { DottedDivider } from "@/components/ui/Dotted";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

type Status = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
type ReviewAction = "approve" | "request_changes" | "reject";

type AttachmentRow = {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  status: Status;
  feedback: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
};

type Post = {
  id: string;
  title: string;
  caption: string | null;
  status: Status;
  feedback: string | null;
  reviewedAt: string | null;
  createdAt: string;
  client: { name: string };
  project: { name: string } | null;
  demandType: { name: string; color: string } | null;
  createdBy: { name: string; avatarUrl: string | null } | null;
  attachments: AttachmentRow[];
};

const STATUS_META: Record<Status, { label: string; tone: string; icon: typeof Clock }> = {
  PENDING: { label: "Aguardando sua análise", tone: "text-muted border-border bg-surface-2", icon: Clock },
  APPROVED: { label: "Aprovado", tone: "text-success border-success/30 bg-success/10", icon: CheckCircle2 },
  CHANGES_REQUESTED: {
    label: "Alteração solicitada",
    tone: "text-danger border-danger/30 bg-danger/10",
    icon: MessageSquareWarning,
  },
  REJECTED: { label: "Reprovado", tone: "text-danger border-danger/30 bg-danger/10", icon: XCircle },
};

export function PortalApprovalView({
  initialPost,
  onSubmitDecision,
  backHref,
}: {
  initialPost: Post;
  onSubmitDecision: (attachmentId: string, action: ReviewAction, feedback: string) => Promise<Post>;
  backHref: string;
}) {
  const [post, setPost] = useState(initialPost);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedbackAction, setFeedbackAction] = useState<"request_changes" | "reject" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingDecision, setEditingDecision] = useState(false);

  const attachments = post.attachments;
  const active = attachments[activeIndex];

  function resetSlideUi() {
    setFeedbackAction(null);
    setFeedback("");
    setFeedbackError(null);
    setEditingDecision(false);
  }

  function goTo(index: number) {
    setActiveIndex(((index % attachments.length) + attachments.length) % attachments.length);
    resetSlideUi();
  }

  async function submit(action: ReviewAction) {
    if (action !== "approve" && !feedback.trim()) {
      setFeedbackError(action === "reject" ? "Descreva o motivo da reprovação" : "Descreva o que precisa mudar");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await onSubmitDecision(active.id, action, feedback);
      setPost(updated);
      resetSlideUi();
    } finally {
      setSubmitting(false);
    }
  }

  const approvedCount = attachments.filter((a) => a.status === "APPROVED").length;
  const changesCount = attachments.filter((a) => a.status === "CHANGES_REQUESTED").length;
  const rejectedCount = attachments.filter((a) => a.status === "REJECTED").length;
  const pendingCount = attachments.filter((a) => a.status === "PENDING").length;

  const meta = STATUS_META[active.status];
  const decided = active.status !== "PENDING" && !editingDecision;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13px] font-medium text-muted hover:text-accent shadow-sm shadow-black/5 transition-colors"
        >
          <ArrowLeft size={14} /> Voltar às aprovações
        </Link>
        <Link
          href="/portal/mensagens"
          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-2 text-[13px] font-medium text-muted hover:text-accent shadow-sm shadow-black/5 transition-colors"
        >
          <MessageCircle size={14} /> Falar com a equipe
        </Link>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
        <Card padding="none" className="overflow-hidden">
          <div className="relative w-full bg-surface flex items-center justify-center py-6 px-4">
            {active.type === "VIDEO" ? (
              <video
                key={active.id}
                src={active.url}
                controls
                className="max-w-full max-h-[60vh] w-auto h-auto rounded-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt={post.title} className="max-w-full max-h-[60vh] w-auto h-auto object-contain rounded-2xl" />
            )}

            {attachments.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex - 1)}
                  aria-label="Arquivo anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => goTo(activeIndex + 1)}
                  aria-label="Próximo arquivo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}
          </div>

          {attachments.length > 1 && (
            <>
              <DottedDivider />
              <div className="flex items-center gap-2.5 p-4 overflow-x-auto">
                {attachments.map((a, i) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all",
                      i === activeIndex ? "border-accent" : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    {a.type === "VIDEO" ? (
                      <video src={a.url} className="w-full h-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {STATUS_META[a.status].tone && a.status !== "PENDING" && (
                      <span
                        className={cn(
                          "absolute bottom-1 right-1 w-4 h-4 rounded-full flex items-center justify-center",
                          a.status === "APPROVED" ? "bg-success" : "bg-danger",
                        )}
                      >
                        {a.status === "APPROVED" ? (
                          <CheckCircle2 size={10} className="text-black" />
                        ) : (
                          <XCircle size={10} className="text-white" />
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Panel className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-light tracking-tight leading-snug text-panel-ink">{post.title}</h1>
              {post.createdBy && (
                <p className="flex items-center gap-1.5 text-xs text-panel-muted mt-2">
                  <Avatar name={post.createdBy.name} url={post.createdBy.avatarUrl} size={16} className="text-[8px]" />
                  Enviado por {post.createdBy.name}
                </p>
              )}
              {post.caption && (
                <p className="text-sm text-panel-muted mt-3 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
              )}
            </div>

            {attachments.length > 1 && (
              <div className="flex items-center justify-between text-[11px] text-panel-muted font-medium flex-wrap gap-1 border-t border-dotted border-panel-2 pt-3.5">
                <span>
                  Arquivo {activeIndex + 1} de {attachments.length}
                </span>
                <span>
                  {approvedCount > 0 && `${approvedCount} aprovado${approvedCount > 1 ? "s" : ""}`}
                  {approvedCount > 0 && (changesCount > 0 || rejectedCount > 0 || pendingCount > 0) && " · "}
                  {changesCount > 0 && `${changesCount} com alteração`}
                  {changesCount > 0 && (rejectedCount > 0 || pendingCount > 0) && " · "}
                  {rejectedCount > 0 && `${rejectedCount} reprovado${rejectedCount > 1 ? "s" : ""}`}
                  {rejectedCount > 0 && pendingCount > 0 && " · "}
                  {pendingCount > 0 && `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`}
                </span>
              </div>
            )}

            <div className={cn("flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full border", meta.tone)}>
              <meta.icon size={14} />
              {meta.label}
              {active.reviewedAt && decided && (
                <span className="font-medium opacity-70">
                  · {active.reviewedByName ? `${active.reviewedByName}, ` : ""}
                  {formatDate(active.reviewedAt)}
                </span>
              )}
            </div>

            {(active.status === "CHANGES_REQUESTED" || active.status === "REJECTED") && active.feedback && decided && (
              <p className="text-sm text-panel-ink bg-panel-2 rounded-2xl px-4 py-3 leading-relaxed">
                &ldquo;{active.feedback}&rdquo;
              </p>
            )}
          </Panel>

          <Card padding="none" className="p-5">
            {decided ? (
              <button
                type="button"
                onClick={() => setEditingDecision(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} /> Alterar minha decisão
              </button>
            ) : feedbackAction ? (
              <div className="flex flex-col gap-2.5">
                <Textarea
                  autoFocus
                  value={feedback}
                  onChange={(e) => {
                    setFeedback(e.target.value);
                    if (e.target.value.trim()) setFeedbackError(null);
                  }}
                  placeholder={
                    feedbackAction === "reject" ? "Por que este arquivo foi reprovado?" : "O que precisa mudar neste arquivo?"
                  }
                  className={feedbackError ? "border-danger" : undefined}
                />
                {feedbackError && <span className="text-xs text-danger pl-1.5">{feedbackError}</span>}
                <div className="flex gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => setFeedbackAction(null)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 bg-danger/10"
                    onClick={() => submit(feedbackAction)}
                    disabled={submitting}
                  >
                    {submitting ? "Enviando..." : "Enviar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button variant="success" size="lg" className="w-full" onClick={() => submit("approve")} disabled={submitting}>
                  <CheckCircle2 size={15} /> Aprovar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    className="flex-1 px-3 whitespace-nowrap"
                    onClick={() => setFeedbackAction("request_changes")}
                    disabled={submitting}
                  >
                    <MessageSquareWarning size={14} className="hidden min-[420px]:inline-block flex-shrink-0" /> Pedir alterações
                  </Button>
                  <Button
                    variant="danger"
                    size="md"
                    className="flex-1 px-3 whitespace-nowrap"
                    onClick={() => setFeedbackAction("reject")}
                    disabled={submitting}
                  >
                    <XCircle size={14} className="hidden min-[420px]:inline-block flex-shrink-0" /> Reprovar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
