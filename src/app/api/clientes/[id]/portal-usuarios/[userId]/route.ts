import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { clientPortalUserSchema } from "@/lib/schemas";
import { z } from "zod";

type Params = { params: Promise<{ id: string; userId: string }> };

const updateSchema = clientPortalUserSchema.extend({
  active: z.coerce.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id, userId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    const result = await prisma.clientPortalUser.updateMany({
      where: { id: userId, clientId: id },
      data: {
        name: data.name,
        role: data.role || null,
        email: data.email.toLowerCase().trim(),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    if (result.count === 0) return Response.json({ error: "Pessoa não encontrada" }, { status: 404 });

    const user = await prisma.clientPortalUser.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, email: true, active: true, lastLoginAt: true, createdAt: true },
    });
    return Response.json(user);
  } catch {
    return Response.json({ error: "Já existe uma pessoa cadastrada com esse email" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, userId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const result = await prisma.clientPortalUser.deleteMany({ where: { id: userId, clientId: id } });
  if (result.count === 0) return Response.json({ error: "Pessoa não encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}
