import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { clientPortalUserSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const users = await prisma.clientPortalUser.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true, email: true, active: true, lastLoginAt: true, createdAt: true },
  });
  return Response.json(users);
}

/** Cria a pessoa e já gera a senha no mesmo passo (não separa em duas telas, pra não repetir o bug de "email ainda não salvo" da senha do cliente principal). */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = clientPortalUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const plainPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  try {
    const user = await prisma.clientPortalUser.create({
      data: {
        name: data.name,
        role: data.role || null,
        email: data.email.toLowerCase().trim(),
        passwordHash,
        clientId: id,
      },
      select: { id: true, name: true, role: true, email: true, active: true, lastLoginAt: true, createdAt: true },
    });
    return Response.json({ user, password: plainPassword }, { status: 201 });
  } catch {
    return Response.json({ error: "Já existe uma pessoa cadastrada com esse email" }, { status: 400 });
  }
}
