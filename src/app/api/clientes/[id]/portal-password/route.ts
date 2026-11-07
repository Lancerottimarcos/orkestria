import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const client = await prisma.client.findUnique({ where: { id }, select: { id: true, portalEmail: true } });
  if (!client) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!client.portalEmail) {
    return Response.json(
      { error: "Defina o email de acesso do portal antes de gerar a senha" },
      { status: 400 },
    );
  }

  const plainPassword = crypto.randomBytes(9).toString("base64url");
  const portalPasswordHash = await bcrypt.hash(plainPassword, 10);

  await prisma.client.update({
    where: { id },
    data: { portalPasswordHash, passwordResetRequestedAt: null },
  });

  return Response.json({ password: plainPassword });
}
