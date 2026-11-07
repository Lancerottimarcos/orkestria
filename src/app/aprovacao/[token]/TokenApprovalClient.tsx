"use client";

import { ApprovalView } from "@/components/posts/ApprovalView";

export function TokenApprovalClient({ token, initialPost }: { token: string; initialPost: Parameters<typeof ApprovalView>[0]["initialPost"] }) {
  return (
    <ApprovalView
      initialPost={initialPost}
      askReviewerName
      onSubmitDecision={async (attachmentId, action, feedback, reviewerName) => {
        const res = await fetch(`/api/aprovacao/${token}/attachments/${attachmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, feedback, reviewerName }),
        });
        return res.json();
      }}
    />
  );
}
