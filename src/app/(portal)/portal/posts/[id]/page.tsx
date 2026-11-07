import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { POST_REVIEW_SELECT } from "@/lib/postReview";
import { PortalApprovalClient } from "./PortalApprovalClient";

type Params = { params: Promise<{ id: string }> };

export default async function PortalPostPage({ params }: Params) {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: { ...POST_REVIEW_SELECT, clientId: true },
  });

  if (!post || post.clientId !== session.user.clientId) notFound();

  const serialized = {
    ...post,
    reviewedAt: post.reviewedAt ? post.reviewedAt.toISOString() : null,
    createdAt: post.createdAt.toISOString(),
    // Anexo de Post nunca é FILE - só imagem/vídeo entra nesse fluxo (garantido no schema de escrita).
    attachments: post.attachments.map((a) => ({
      ...a,
      type: a.type as "IMAGE" | "VIDEO",
      reviewedAt: a.reviewedAt ? a.reviewedAt.toISOString() : null,
    })),
  };

  return <PortalApprovalClient postId={id} initialPost={serialized} />;
}
