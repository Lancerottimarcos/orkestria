import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { clientCredentialSchema } from "@/lib/schemas";
import { encryptSecret } from "@/lib/crypto";

type Params = { params: Promise<{ id: string }> };

const CREDENTIAL_SELECT = { id: true, label: true, username: true, url: true, notes: true, createdAt: true, updatedAt: true };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("senhas", id);
  if (error) return error;

  const credentials = await prisma.clientCredential.findMany({
    where: { clientId: id },
    orderBy: { createdAt: "desc" },
    select: CREDENTIAL_SELECT,
  });
  return Response.json(credentials);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("senhas", id);
  if (error) return error;

  const body = await request.json();
  const parsed = clientCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!parsed.data.secret) {
    return Response.json({ error: { fieldErrors: { secret: ["Informe a senha"] } } }, { status: 400 });
  }

  let secretEnc: string;
  try {
    secretEnc = encryptSecret(parsed.data.secret);
  } catch (e) {
    console.error("[crypto] falha ao criptografar credencial:", e);
    return Response.json({ error: "Não foi possível salvar a senha - verifique a chave de criptografia do servidor" }, { status: 500 });
  }

  const credential = await prisma.clientCredential.create({
    data: {
      clientId: id,
      label: parsed.data.label,
      username: parsed.data.username || null,
      url: parsed.data.url || null,
      notes: parsed.data.notes || null,
      secretEnc,
    },
    select: CREDENTIAL_SELECT,
  });
  return Response.json(credential, { status: 201 });
}
