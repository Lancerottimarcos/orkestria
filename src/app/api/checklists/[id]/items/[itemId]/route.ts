import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const { id, itemId } = await params;
  const body = await request.json();

  const data: { text?: string; done?: boolean } = {};
  if (typeof body.text === "string") data.text = body.text;
  if (typeof body.done === "boolean") data.done = body.done;

  const result = await prisma.checklistItem.updateMany({ where: { id: itemId, checklistId: id }, data });
  if (result.count === 0) return Response.json({ error: "Item não encontrado" }, { status: 404 });
  await prisma.checklist.update({ where: { id }, data: { updatedAt: new Date() } });

  const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
  return Response.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const { id, itemId } = await params;
  const result = await prisma.checklistItem.deleteMany({ where: { id: itemId, checklistId: id } });
  if (result.count === 0) return Response.json({ error: "Item não encontrado" }, { status: 404 });
  await prisma.checklist.update({ where: { id }, data: { updatedAt: new Date() } });

  return Response.json({ ok: true });
}
