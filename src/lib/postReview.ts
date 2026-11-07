import type { PostStatus } from "@/generated/prisma/client";
import type { PostReviewInput } from "@/lib/schemas";

export function statusForAction(action: PostReviewInput["action"]): PostStatus {
  if (action === "approve") return "APPROVED";
  if (action === "reject") return "REJECTED";
  return "CHANGES_REQUESTED";
}

export function aggregatePostStatus(
  attachments: { status: PostStatus; feedback: string | null }[],
): { status: PostStatus; feedback: string | null } {
  const rejected = attachments.find((a) => a.status === "REJECTED");
  if (rejected) return { status: "REJECTED", feedback: rejected.feedback };

  const changesRequested = attachments.find((a) => a.status === "CHANGES_REQUESTED");
  if (changesRequested) return { status: "CHANGES_REQUESTED", feedback: changesRequested.feedback };

  if (attachments.length > 0 && attachments.every((a) => a.status === "APPROVED")) {
    return { status: "APPROVED", feedback: null };
  }

  return { status: "PENDING", feedback: null };
}

export const POST_REVIEW_SELECT = {
  id: true,
  title: true,
  caption: true,
  status: true,
  feedback: true,
  reviewedAt: true,
  createdAt: true,
  client: { select: { name: true } },
  project: { select: { name: true } },
  demandType: { select: { name: true, color: true } },
  createdBy: { select: { name: true, avatarUrl: true } },
  attachments: {
    orderBy: { position: "asc" as const },
    select: { id: true, url: true, type: true, status: true, feedback: true, reviewedAt: true, reviewedByName: true },
  },
} as const;
