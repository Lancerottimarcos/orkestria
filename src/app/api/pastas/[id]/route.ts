import { prisma } from "@/lib/prisma";
import { requireModule, requireSession } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

const KIND_MODULE = { NOTE: "notas", CHECKLIST: "checklist" } as const;

export async function PATCH(request: Request, { params }: Params) {
  const { error: sessionError } = await requireSession();
  if (sessionError) return sessionError;

  const { id } = await params;
  const existing = await prisma.folder.findUnique({ where: { id }, select: { kind: true } });
  if (!existing) return Response.json({ error: "Pasta não encontrada" }, { status: 404 });

  const { error } = await requireModule(KIND_MODULE[existing.kind]);
  if (error) return error;

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "Nome inválido" }, { status: 400 });
  }

  const folder = await prisma.folder.update({ where: { id }, data: { name } });
  return Response.json(folder);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error: sessionError } = await requireSession();
  if (sessionError) return sessionError;

  const { id } = await params;
  const existing = await prisma.folder.findUnique({ where: { id }, select: { kind: true } });
  if (!existing) return Response.json({ error: "Pasta não encontrada" }, { status: 404 });

  const { error } = await requireModule(KIND_MODULE[existing.kind]);
  if (error) return error;

  await prisma.folder.delete({ where: { id } });
  return Response.json({ ok: true });
}
