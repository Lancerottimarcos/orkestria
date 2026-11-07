import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { commentSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { cardId: id },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  });

  return Response.json(comments);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const comment = await prisma.comment.create({
    data: {
      text: data.text,
      imageUrl: data.imageUrl || null,
      mentionedUserId: data.mentionedUserId || null,
      cardId: id,
      authorId: session!.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  });

  return Response.json(comment, { status: 201 });
}
