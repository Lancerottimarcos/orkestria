import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";

type Params = { params: Promise<{ id: string; credId: string }> };

/** Decripta e devolve a senha só nesta chamada específica - nunca incluída na listagem. */
export async function GET(_request: Request, { params }: Params) {
  const { id, credId } = await params;
  const { session, error } = await requireClientAccess("senhas", id);
  if (error) return error;

  const credential = await prisma.clientCredential.findUnique({ where: { id: credId }, select: { secretEnc: true } });
  if (!credential) return Response.json({ error: "Credencial não encontrada" }, { status: 404 });

  let secret: string;
  try {
    secret = decryptSecret(credential.secretEnc);
  } catch (e) {
    console.error("[crypto] falha ao decriptar credencial:", e);
    return Response.json({ error: "Não foi possível revelar a senha - verifique a chave de criptografia do servidor" }, { status: 500 });
  }

  await prisma.credentialRevealLog.create({
    data: { credentialId: credId, userId: session!.user.id },
  });

  return Response.json({ secret });
}
