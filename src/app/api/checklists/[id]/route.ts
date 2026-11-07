import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { checklistSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = checklistSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const checklist = await prisma.checklist.update({
    where: { id },
    data: {
      title: data.title,
      folderId: data.folderId || null,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
    },
    include: { folder: true, client: true, project: true, items: { orderBy: { position: "asc" } } },
  });

  return Response.json(checklist);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const { id } = await params;
  await prisma.checklist.delete({ where: { id } });
  return Response.json({ ok: true });
}
