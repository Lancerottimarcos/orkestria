import { requireAdmin } from "@/lib/authz";
import { exchangeCodeForTikTokToken, queryTikTokCreatorInfo } from "@/lib/tiktok";
import { getTikTokAppCredentials } from "@/lib/tiktokConfig";
import { verifyTikTokState, finalizeTikTokConnection } from "@/lib/tiktokConnection";

function redirectToClient(clientId: string, status: "connected" | "error", detail?: string) {
  const url = new URL(`/clientes/${clientId}`, process.env.AUTH_URL ?? "http://localhost:3000");
  url.searchParams.set("tiktok", status);
  if (detail) url.searchParams.set("tiktokDetail", detail);
  return Response.redirect(url.toString(), 302);
}

/**
 * Volta do TikTok com o "code": troca por token e conclui a conexão.
 * Diferente da Meta, um login já autoriza uma única conta - não tem etapa de
 * escolher entre várias (não existe "Página" no TikTok).
 */
export async function GET(request: Request) {
  // Conectar uma conta social é ação exclusivamente interna - mesmo gate de
  // admin já exigido pra iniciar (connect/finalize/pending/config).
  const { session, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const state = stateRaw ? verifyTikTokState(stateRaw) : null;
  if (!state) {
    return Response.json({ error: "State inválido ou expirado, inicie a conexão novamente" }, { status: 400 });
  }
  if (oauthError || !code) {
    return redirectToClient(state.clientId, "error", oauthError ?? "Autorização cancelada");
  }

  const credentials = await getTikTokAppCredentials();
  if (!credentials) {
    return redirectToClient(state.clientId, "error", "App do TikTok não está mais configurado");
  }

  try {
    const token = await exchangeCodeForTikTokToken(
      code,
      credentials.clientKey,
      credentials.clientSecret,
      credentials.redirectUri,
      state.codeVerifier,
    );
    const creator = await queryTikTokCreatorInfo(token.access_token);
    await finalizeTikTokConnection(state.clientId, session!.user.id, token, creator);
    return redirectToClient(state.clientId, "connected");
  } catch (err) {
    console.error("[tiktok/callback] erro", err);
    return redirectToClient(state.clientId, "error", err instanceof Error ? err.message : "Falha na conexão");
  }
}
