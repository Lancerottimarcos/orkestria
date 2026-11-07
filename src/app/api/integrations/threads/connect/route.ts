import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildThreadsOAuthUrl } from "@/lib/threads";
import { getThreadsAppCredentials } from "@/lib/threadsConfig";
import { signThreadsState } from "@/lib/threadsConnection";

/** Inicia a conexão: redireciona pro diálogo de consentimento do Threads (OAuth 2.0). */
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

  const credentials = await getThreadsAppCredentials();
  if (!credentials) {
    return Response.json(
      { error: "App do Threads ainda não configurado. Vá em Configurações → Integrações e cadastre o App ID e a Chave secreta." },
      { status: 400 },
    );
  }

  const state = signThreadsState(clientId);
  return Response.redirect(buildThreadsOAuthUrl(state, credentials.appId, credentials.redirectUri), 302);
}
