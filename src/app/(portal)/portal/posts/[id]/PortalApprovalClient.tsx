"use client";

import { PortalApprovalView } from "@/components/portal/PortalApprovalView";

export function PortalApprovalClient({
  postId,
  initialPost,
}: {
  postId: string;
  initialPost: Parameters<typeof PortalApprovalView>[0]["initialPost"];
}) {
  return (
    <PortalApprovalView
      initialPost={initialPost}
      backHref="/portal"
      onSubmitDecision={async (attachmentId, action, feedback) => {
        const res = await fetch(`/api/portal/posts/${postId}/attachments/${attachmentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, feedback }),
        });
        return res.json();
      }}
    />
  );
}
