import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return Response.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const plainPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash, passwordResetRequestedAt: null },
  });

  return Response.json({ password: plainPassword });
}
