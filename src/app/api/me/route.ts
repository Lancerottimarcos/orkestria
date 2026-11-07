import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { meSchema } from "@/lib/schemas";

export async function GET() {
  const { session, error } = await requireSession();
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, name: true, email: true, role: true, setor: true, cargo: true, avatarUrl: true },
  });
  if (!user) {
    return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  return Response.json(user);
}

export async function PATCH(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const parsed = meSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const userId = session!.user.id;

  const existingEmail = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existingEmail && existingEmail.id !== userId) {
    return Response.json(
      { error: { formErrors: ["Já existe um usuário com este email"] } },
      { status: 400 },
    );
  }

  let passwordHash: string | undefined;
  if (data.newPassword) {
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const currentOk = data.currentPassword
      ? await bcrypt.compare(data.currentPassword, current.passwordHash)
      : false;
    if (!currentOk) {
      return Response.json(
        { error: { formErrors: ["Senha atual incorreta"] } },
        { status: 400 },
      );
    }
    passwordHash = await bcrypt.hash(data.newPassword, 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email.toLowerCase().trim(),
      avatarUrl: data.avatarUrl || null,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: { id: true, name: true, email: true, role: true, setor: true, cargo: true, avatarUrl: true },
  });

  return Response.json(user);
}
