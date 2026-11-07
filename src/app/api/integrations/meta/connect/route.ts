import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildMetaOAuthUrl } from "@/lib/meta";
import { getMetaAppCredentials } from "@/lib/metaConfig";
import { signState } from "@/lib/metaConnection";

/** Inicia a conexão: redireciona pro diálogo de login/permissões da Meta. */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  if (!clientId) {
    return Response.json({ error: "clientId é obrigatório" }, { status: 400 });
  }
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const credentials = await getMetaAppCredentials();
  if (!credentials) {
    return Response.json(
      { error: "App da Meta ainda não configurado. Vá em Configurações → Integrações e cadastre o App ID e a Chave secreta." },
      { status: 400 },
    );
  }

  const state = signState(`${clientId}|${Date.now()}`);
  return Response.redirect(buildMetaOAuthUrl(state, credentials.appId, credentials.redirectUri), 302);
}
