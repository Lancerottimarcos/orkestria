import { requireAdmin } from "@/lib/authz";
import { exchangeCodeForThreadsToken, exchangeForLongLivedThreadsToken, fetchThreadsProfile } from "@/lib/threads";
import { getThreadsAppCredentials } from "@/lib/threadsConfig";
import { verifyThreadsState, finalizeThreadsConnection } from "@/lib/threadsConnection";

function redirectToClient(clientId: string, status: "connected" | "error", detail?: string) {
  const url = new URL(`/clientes/${clientId}`, process.env.AUTH_URL ?? "http://localhost:3000");
  url.searchParams.set("threads", status);
  if (detail) url.searchParams.set("threadsDetail", detail);
  return Response.redirect(url.toString(), 302);
}

/** Volta do Threads com o "code": troca por token de curta duração, depois longa duração, e finaliza a conexão. */
export async function GET(request: Request) {
  // Conectar uma conta social é ação exclusivamente interna - mesmo gate de
  // admin já exigido pra iniciar (connect/finalize/pending/config).
  const { session, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_message") ?? url.searchParams.get("error");

  const state = stateRaw ? verifyThreadsState(stateRaw) : null;
  if (!state) {
    return Response.json({ error: "State inválido ou expirado, inicie a conexão novamente" }, { status: 400 });
  }
  if (oauthError || !code) {
    return redirectToClient(state.clientId, "error", oauthError ?? "Autorização cancelada");
  }

  const credentials = await getThreadsAppCredentials();
  if (!credentials) {
    return redirectToClient(state.clientId, "error", "App do Threads não está mais configurado");
  }

  try {
    const shortLived = await exchangeCodeForThreadsToken(code, credentials.appId, credentials.appSecret, credentials.redirectUri);
    const longLived = await exchangeForLongLivedThreadsToken(shortLived.access_token, credentials.appSecret);
    const profile = await fetchThreadsProfile(longLived.access_token);

    await finalizeThreadsConnection(state.clientId, session!.user.id, profile, longLived);
    return redirectToClient(state.clientId, "connected");
  } catch (err) {
    console.error("[threads/callback] erro", err);
    return redirectToClient(state.clientId, "error", err instanceof Error ? err.message : "Falha na conexão");
  }
}
