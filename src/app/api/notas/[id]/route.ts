import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { noteSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("notas");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const note = await prisma.note.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content || null,
      folderId: data.folderId || null,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
    },
    include: { folder: true, client: true, project: true, author: { select: { id: true, name: true } } },
  });

  return Response.json(note);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("notas");
  if (error) return error;

  const { id } = await params;
  await prisma.note.delete({ where: { id } });
  return Response.json({ ok: true });
}
