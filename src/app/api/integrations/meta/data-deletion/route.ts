import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getMetaAppCredentials } from "@/lib/metaConfig";
import { parseMetaSignedRequest } from "@/lib/metaSignedRequest";

function baseUrl(): string {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

/**
 * Callback de "Exclusão de dados do usuário" da Meta (Configurações do app →
 * Básico): chamado quando alguém pede a exclusão dos próprios dados pelas
 * configurações do Facebook/Instagram. Remove as contas ligadas a essa
 * pessoa e devolve a URL de status exigida pela Meta.
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

  const { count } = await prisma.socialAccount.deleteMany({ where: { metaUserId: payload.user_id } });

  const confirmationCode = crypto.randomBytes(12).toString("hex");
  await prisma.metaDataDeletionRequest.create({
    data: {
      confirmationCode,
      metaUserId: payload.user_id,
      status: "COMPLETED",
      accountsRemoved: count,
      completedAt: new Date(),
    },
  });

  return Response.json({
    url: `${baseUrl()}/solicitacoes-exclusao-dados/${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
