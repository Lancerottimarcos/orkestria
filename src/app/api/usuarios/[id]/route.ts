import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { userSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (id === session!.user.id && data.role !== "ADMIN") {
    return Response.json(
      { error: { formErrors: ["Você não pode remover seu próprio acesso de administrador"] } },
      { status: 400 },
    );
  }

  const before = await prisma.user.findUnique({ where: { id }, select: { role: true, moduleAccess: true } });

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      role: data.role,
      setor: data.setor || null,
      cargo: data.cargo || null,
      active: data.active ?? true,
      moduleAccess: data.role === "MEMBER" ? JSON.stringify(data.modules ?? []) : null,
      clientAccess: data.role === "MEMBER" && data.clients ? JSON.stringify(data.clients) : null,
      avatarUrl: data.avatarUrl || null,
      ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      setor: true,
      cargo: true,
      active: true,
      moduleAccess: true,
      clientAccess: true,
      avatarUrl: true,
      passwordResetRequestedAt: true,
      createdAt: true,
    },
  });

  // Trilha de auditoria não cobria gestão de usuários/permissões (role,
  // módulos liberados) - o tipo de ação mais sensível a segurança do
  // sistema, mesmo fora do escopo literal "clientes/financeiro/contratos".
  const roleChanged = before && before.role !== user.role;
  await logActivity({
    action: "update",
    entityType: "User",
    entityId: user.id,
    summary: roleChanged
      ? `Usuário "${user.name}" editado - papel alterado para ${user.role === "ADMIN" ? "Admin" : "Membro"}`
      : `Usuário "${user.name}" editado`,
    userId: session!.user.id,
  });

  return Response.json(user);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  if (id === session!.user.id) {
    return Response.json(
      { error: "Você não pode remover sua própria conta" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  await prisma.user.delete({ where: { id } });

  await logActivity({
    action: "delete",
    entityType: "User",
    entityId: id,
    summary: `Usuário "${user?.name ?? id}" excluído`,
    userId: session!.user.id,
  });

  return Response.json({ ok: true });
}
