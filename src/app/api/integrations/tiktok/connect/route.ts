import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { buildTikTokOAuthUrl, generateTikTokPkcePair } from "@/lib/tiktok";
import { getTikTokAppCredentials } from "@/lib/tiktokConfig";
import { signTikTokState } from "@/lib/tiktokConnection";

/** Inicia a conexão: redireciona pro diálogo de autorização do TikTok (Login Kit). */
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

  const credentials = await getTikTokAppCredentials();
  if (!credentials) {
    return Response.json(
      { error: "App do TikTok ainda não configurado. Vá em Configurações → Integrações e cadastre o Client Key e a Chave secreta." },
      { status: 400 },
    );
  }

  const { codeVerifier, codeChallenge } = generateTikTokPkcePair();
  const state = signTikTokState(clientId, codeVerifier);
  return Response.redirect(
    buildTikTokOAuthUrl(state, credentials.clientKey, credentials.redirectUri, codeChallenge),
    302,
  );
}
