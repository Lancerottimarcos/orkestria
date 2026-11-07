import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { POST_REVIEW_SELECT } from "@/lib/postReview";
import { TokenApprovalClient } from "./TokenApprovalClient";

type Params = { params: Promise<{ token: string }> };

export default async function AprovacaoPage({ params }: Params) {
  const { token } = await params;

  const post = await prisma.post.findUnique({
    where: { token },
    select: POST_REVIEW_SELECT,
  });

  if (!post) notFound();

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

  return <TokenApprovalClient token={token} initialPost={serialized} />;
}
