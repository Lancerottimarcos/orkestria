import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { clientCredentialSchema } from "@/lib/schemas";
import { encryptSecret } from "@/lib/crypto";

type Params = { params: Promise<{ id: string; credId: string }> };

const CREDENTIAL_SELECT = { id: true, label: true, username: true, url: true, notes: true, createdAt: true, updatedAt: true };

export async function PATCH(request: Request, { params }: Params) {
  const { id, credId } = await params;
  const { error } = await requireClientAccess("senhas", id);
  if (error) return error;

  const body = await request.json();
  const parsed = clientCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.clientCredential.findFirst({ where: { id: credId, clientId: id }, select: { id: true } });
  if (!existing) return Response.json({ error: "Credencial não encontrada" }, { status: 404 });

  let secretEnc: string | undefined;
  if (parsed.data.secret) {
    try {
      secretEnc = encryptSecret(parsed.data.secret);
    } catch (e) {
      console.error("[crypto] falha ao criptografar credencial:", e);
      return Response.json({ error: "Não foi possível salvar a senha - verifique a chave de criptografia do servidor" }, { status: 500 });
    }
  }

  const credential = await prisma.clientCredential.update({
    where: { id: credId },
    data: {
      label: parsed.data.label,
      username: parsed.data.username || null,
      url: parsed.data.url || null,
      notes: parsed.data.notes || null,
      // secret vazio = mantém o valor criptografado já salvo (não reenviar a senha pra editar só o rótulo/URL)
      ...(secretEnc ? { secretEnc } : {}),
    },
    select: CREDENTIAL_SELECT,
  });
  return Response.json(credential);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, credId } = await params;
  const { error } = await requireClientAccess("senhas", id);
  if (error) return error;

  const result = await prisma.clientCredential.deleteMany({ where: { id: credId, clientId: id } });
  if (result.count === 0) return Response.json({ error: "Credencial não encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}
