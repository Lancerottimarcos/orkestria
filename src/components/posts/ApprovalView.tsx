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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  PENDING: { label: "Aguardando sua análise", tone: "text-ink border-border bg-surface-2/60", icon: Clock },
  APPROVED: { label: "Aprovado", tone: "text-success border-success/30 bg-success/5", icon: CheckCircle2 },
  CHANGES_REQUESTED: {
    label: "Alteração solicitada",
    tone: "text-danger border-danger/30 bg-danger/5",
    icon: MessageSquareWarning,
  },
  REJECTED: { label: "Reprovado", tone: "text-danger border-danger/30 bg-danger/5", icon: XCircle },
};

const DOT_COLOR: Record<Status, string> = {
  PENDING: "",
  APPROVED: "var(--color-success)",
  CHANGES_REQUESTED: "var(--color-danger)",
  REJECTED: "color-mix(in srgb, var(--color-danger) 55%, black)",
};

export function ApprovalView({
  initialPost,
  onSubmitDecision,
  backHref,
  askReviewerName,
}: {
  initialPost: Post;
  onSubmitDecision: (attachmentId: string, action: ReviewAction, feedback: string, reviewerName?: string) => Promise<Post>;
  backHref?: string;
  /** Link público sem login: ninguém sabe quem está decidindo, então pede o nome antes de liberar os botões. */
  askReviewerName?: boolean;
}) {
  const [post, setPost] = useState(initialPost);
  const [activeIndex, setActiveIndex] = useState(0);
  const [feedbackAction, setFeedbackAction] = useState<"request_changes" | "reject" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingDecision, setEditingDecision] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerNameError, setReviewerNameError] = useState<string | null>(null);

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
    if (askReviewerName && !reviewerName.trim()) {
      setReviewerNameError("Informe seu nome antes de decidir");
      return;
    }
    if (action !== "approve" && !feedback.trim()) {
      setFeedbackError(action === "reject" ? "Descreva o motivo da reprovação" : "Descreva o que precisa mudar");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await onSubmitDecision(active.id, action, feedback, askReviewerName ? reviewerName.trim() : undefined);
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
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.08] blur-[120px]" />
        <div className="hidden sm:block absolute top-[-8rem] right-[-6rem] w-[20rem] h-[20rem] rounded-full bg-accent-light/[0.05] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4 bg-surface rounded-full px-3.5 py-2 shadow-sm shadow-black/5"
          >
            <ArrowLeft size={14} /> Voltar
          </Link>
        )}
        <div className="text-center mb-6">
          <p className="text-xl font-semibold tracking-tight text-ink">
            Or<span className="text-accent">kestrya</span>
          </p>
          <p className="text-[13px] text-muted mt-1.5">
            Aprovação de post · {post.client.name}
            {post.project ? ` · ${post.project.name}` : ""}
          </p>
        </div>

        <div className="bg-surface rounded-card overflow-hidden shadow-2xl shadow-black/10 p-2">
          <div className="relative w-full bg-surface rounded-[22px] overflow-hidden flex items-center justify-center py-4 max-h-[55vh]">
            {active.type === "VIDEO" ? (
              <video key={active.id} src={active.url} controls className="max-w-full max-h-[55vh] w-auto h-auto rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt={post.title} className="max-w-full max-h-[55vh] w-auto h-auto object-contain rounded-xl" />
            )}

            {attachments.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Arquivo anterior"
                  onClick={() => goTo(activeIndex - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Próximo arquivo"
                  onClick={() => goTo(activeIndex + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-3 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/50 px-2.5 py-2 rounded-full">
                  {attachments.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => goTo(i)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all cursor-pointer",
                        i === activeIndex ? "w-4 bg-white" : "bg-white/50",
                      )}
                      style={
                        DOT_COLOR[a.status]
                          ? {
                              background:
                                i === activeIndex
                                  ? DOT_COLOR[a.status]
                                  : `color-mix(in srgb, ${DOT_COLOR[a.status]} 60%, transparent)`,
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="px-4 pt-5 pb-4 sm:px-5 sm:pb-5 flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-semibold text-ink leading-snug">{post.title}</h1>
              {post.createdBy && (
                <p className="text-xs text-muted mt-1.5">Enviado por {post.createdBy.name}</p>
              )}
              {post.caption && <p className="text-sm text-muted mt-2 whitespace-pre-wrap">{post.caption}</p>}
            </div>

            {attachments.length > 1 && (
              <div className="flex items-center justify-between text-[11px] text-muted font-medium flex-wrap gap-1">
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

            <DottedDivider />

            <div
              className={cn(
                "flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full border",
                meta.tone,
              )}
            >
              <meta.icon size={14} strokeWidth={2} />
              {meta.label}
              {active.reviewedAt && decided && <span className="text-muted-2 font-medium">· {formatDate(active.reviewedAt)}</span>}
            </div>

            {(active.status === "CHANGES_REQUESTED" || active.status === "REJECTED") && active.feedback && decided && (
              <p className="text-sm text-ink bg-surface-2 rounded-2xl px-4 py-3">
                &ldquo;{active.feedback}&rdquo;
              </p>
            )}

            {!decided && askReviewerName && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted">Seu nome</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => {
                    setReviewerName(e.target.value);
                    if (e.target.value.trim()) setReviewerNameError(null);
                  }}
                  placeholder="Quem está decidindo?"
                  className={cn(
                    "w-full rounded-xl border bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder:text-muted-2 outline-none focus:border-accent transition-colors",
                    reviewerNameError ? "border-danger" : "border-border",
                  )}
                />
                {reviewerNameError && <span className="text-xs text-danger pl-1.5">{reviewerNameError}</span>}
              </div>
            )}

            {decided ? (
              <button
                type="button"
                onClick={() => setEditingDecision(true)}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors cursor-pointer"
              >
                <RotateCcw size={12} /> Alterar minha decisão
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
                  <Button variant="ghost" size="lg" className="flex-1" onClick={() => setFeedbackAction(null)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
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
                  <CheckCircle2 size={16} strokeWidth={2} /> Aprovar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="flex-1 px-3 whitespace-nowrap"
                    onClick={() => setFeedbackAction("request_changes")}
                    disabled={submitting}
                  >
                    <MessageSquareWarning size={15} className="hidden min-[420px]:inline-block flex-shrink-0" /> Pedir alterações
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    className="flex-1 px-3 whitespace-nowrap"
                    onClick={() => setFeedbackAction("reject")}
                    disabled={submitting}
                  >
                    <XCircle size={15} className="hidden min-[420px]:inline-block flex-shrink-0" /> Reprovar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
