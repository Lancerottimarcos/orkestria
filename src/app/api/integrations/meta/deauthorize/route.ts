import { prisma } from "@/lib/prisma";
import { getMetaAppCredentials } from "@/lib/metaConfig";
import { parseMetaSignedRequest } from "@/lib/metaSignedRequest";

/**
 * Callback de "Desautorizar" da Meta (Configurações do app → Login do
 * Facebook para Empresas → Configurações): chamado quando alguém remove o
 * app pelas configurações de apps do Facebook/Instagram. Desconecta as
 * contas ligadas a essa pessoa, como se tivesse clicado em "Desconectar".
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const signedRequest = form?.get("signed_request");
  if (typeof signedRequest !== "string") {
    return Response.json({ error: "signed_request ausente" }, { status: 400 });
  }

  const credentials = await getMetaAppCredentials();
  if (!credentials) {
    return Response.json({ error: "App da Meta não está configurado" }, { status: 400 });
  }

  const payload = parseMetaSignedRequest(signedRequest, credentials.appSecret);
  if (!payload) {
    return Response.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  await prisma.socialAccount.deleteMany({ where: { metaUserId: payload.user_id } });

  return Response.json({ ok: true });
}
