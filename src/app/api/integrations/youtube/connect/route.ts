import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildGoogleOAuthUrl } from "@/lib/youtube";
import { getYouTubeAppCredentials } from "@/lib/youtubeConfig";
import { signYouTubeState } from "@/lib/youtubeConnection";

/** Inicia a conexão: redireciona pro diálogo de consentimento do Google (OAuth 2.0). */
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

  const credentials = await getYouTubeAppCredentials();
  if (!credentials) {
    return Response.json(
      { error: "App do YouTube ainda não configurado. Vá em Configurações → Integrações e cadastre o Client ID e a Chave secreta." },
      { status: 400 },
    );
  }

  const state = signYouTubeState(clientId);
  return Response.redirect(buildGoogleOAuthUrl(state, credentials.clientId, credentials.redirectUri), 302);
}
