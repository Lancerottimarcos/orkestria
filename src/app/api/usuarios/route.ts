import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireModule } from "@/lib/authz";
import { userSchema } from "@/lib/schemas";
import { logActivity } from "@/lib/activityLog";
import { ensureDigestChannelMembership } from "@/lib/dailyDigest";

export async function GET() {
  const { error } = await requireModule("usuarios");
  if (error) return error;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
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
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return Response.json(users);
}

export async function POST(request: Request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (!data.password) {
    return Response.json(
      { error: { formErrors: ["Senha é obrigatória para novos usuários"] } },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) {
    return Response.json(
      { error: { formErrors: ["Já existe um usuário com este email"] } },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      setor: data.setor || null,
      cargo: data.cargo || null,
      active: data.active ?? true,
      moduleAccess: data.role === "MEMBER" ? JSON.stringify(data.modules ?? []) : null,
      clientAccess: data.role === "MEMBER" && data.clients ? JSON.stringify(data.clients) : null,
      avatarUrl: data.avatarUrl || null,
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

  if (user.active) {
    await ensureDigestChannelMembership(prisma, user.id).catch((err) => console.error("[dailyDigest] falha ao adicionar novo usuário ao canal:", err));
  }

  await logActivity({
    action: "create",
    entityType: "User",
    entityId: user.id,
    summary: `Usuário "${user.name}" criado (${user.role === "ADMIN" ? "Admin" : "Membro"})`,
    userId: session!.user.id,
  });

  return Response.json(user, { status: 201 });
}
