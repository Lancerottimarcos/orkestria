import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { postReviewSchema } from "@/lib/schemas";
import { aggregatePostStatus, statusForAction, POST_REVIEW_SELECT } from "@/lib/postReview";

type Params = { params: Promise<{ id: string; attachmentId: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user.clientId) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id, attachmentId } = await params;

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.clientId !== session.user.clientId) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.postId !== post.id) {
    return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = postReviewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, feedback } = parsed.data;
  if (action !== "approve" && !feedback?.trim()) {
    return Response.json(
      { error: { fieldErrors: { feedback: ["Descreva o que precisa mudar"] } } },
      { status: 400 },
    );
  }

  await prisma.attachment.update({
    where: { id: attachmentId },
    data: {
      status: statusForAction(action),
      feedback: action === "approve" ? null : feedback!.trim(),
      reviewedAt: new Date(),
      reviewedByName: session.user.name ?? null,
    },
  });

  const allAttachments = await prisma.attachment.findMany({ where: { postId: post.id } });
  const aggregated = aggregatePostStatus(allAttachments);

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      status: aggregated.status,
      feedback: aggregated.feedback,
      reviewedAt: new Date(),
    },
    select: POST_REVIEW_SELECT,
  });

  return Response.json(updated);
}
