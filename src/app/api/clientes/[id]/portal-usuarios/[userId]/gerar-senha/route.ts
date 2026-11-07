import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id, userId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const plainPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const result = await prisma.clientPortalUser.updateMany({ where: { id: userId, clientId: id }, data: { passwordHash } });
  if (result.count === 0) return Response.json({ error: "Pessoa não encontrada" }, { status: 404 });

  return Response.json({ password: plainPassword });
}
