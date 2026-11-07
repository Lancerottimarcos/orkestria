import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { noteSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("notas");
  if (error) return error;

  const notes = await prisma.note.findMany({
    orderBy: { updatedAt: "desc" },
    include: { folder: true, client: true, project: true, author: { select: { id: true, name: true } } },
  });
  return Response.json(notes);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("notas");
  if (error) return error;

  const body = await request.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const note = await prisma.note.create({
    data: {
      title: data.title,
      content: data.content || null,
      folderId: data.folderId || null,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      authorId: session!.user.id,
    },
    include: { folder: true, client: true, project: true, author: { select: { id: true, name: true } } },
  });

  return Response.json(note, { status: 201 });
}
