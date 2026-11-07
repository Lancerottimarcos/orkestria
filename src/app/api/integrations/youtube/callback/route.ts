import { requireAdmin } from "@/lib/authz";
import { exchangeCodeForGoogleToken, fetchYouTubeChannelInfo } from "@/lib/youtube";
import { getYouTubeAppCredentials } from "@/lib/youtubeConfig";
import { verifyYouTubeState, finalizeYouTubeConnection } from "@/lib/youtubeConnection";

function redirectToClient(clientId: string, status: "connected" | "error", detail?: string) {
  const url = new URL(`/clientes/${clientId}`, process.env.AUTH_URL ?? "http://localhost:3000");
  url.searchParams.set("youtube", status);
  if (detail) url.searchParams.set("youtubeDetail", detail);
  return Response.redirect(url.toString(), 302);
}

/**
 * Volta do Google com o "code": troca por token, descobre o canal e conclui
 * a conexão. Um login já autoriza um único canal - sem etapa de escolha.
 */
export async function GET(request: Request) {
  // Conectar uma conta social é ação exclusivamente interna - mesmo gate de
  // admin já exigido pra iniciar (connect/finalize/pending/config).
  const { session, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const state = stateRaw ? verifyYouTubeState(stateRaw) : null;
  if (!state) {
    return Response.json({ error: "State inválido ou expirado, inicie a conexão novamente" }, { status: 400 });
  }
  if (oauthError || !code) {
    return redirectToClient(state.clientId, "error", oauthError ?? "Autorização cancelada");
  }

  const credentials = await getYouTubeAppCredentials();
  if (!credentials) {
    return redirectToClient(state.clientId, "error", "App do YouTube não está mais configurado");
  }

  try {
    const token = await exchangeCodeForGoogleToken(code, credentials.clientId, credentials.clientSecret, credentials.redirectUri);
    const channel = await fetchYouTubeChannelInfo(token.access_token);
    await finalizeYouTubeConnection(state.clientId, session!.user.id, token, channel);
    return redirectToClient(state.clientId, "connected");
  } catch (err) {
    console.error("[youtube/callback] erro", err);
    return redirectToClient(state.clientId, "error", err instanceof Error ? err.message : "Falha na conexão");
  }
}
