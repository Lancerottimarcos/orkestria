import { prisma } from "@/lib/prisma";
import { POST_REVIEW_SELECT } from "@/lib/postReview";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;

  const post = await prisma.post.findUnique({
    where: { token },
    select: POST_REVIEW_SELECT,
  });

  if (!post) {
    return Response.json({ error: "Post não encontrado" }, { status: 404 });
  }

  return Response.json(post);
}
