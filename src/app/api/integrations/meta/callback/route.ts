import { requireAdmin } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCodeForUserToken, exchangeForLongLivedToken, listManagedPages, fetchMetaUserId } from "@/lib/meta";
import { getMetaAppCredentials } from "@/lib/metaConfig";
import { verifyState, finalizeMetaConnection, META_PENDING_COOKIE } from "@/lib/metaConnection";

function redirectToClient(clientId: string, status: "connected" | "error" | "pick", detail?: string) {
  const url = new URL(`/clientes/${clientId}`, process.env.AUTH_URL ?? "http://localhost:3000");
  url.searchParams.set("meta", status);
  if (detail) url.searchParams.set("metaDetail", detail);
  return Response.redirect(url.toString(), 302);
}

/** Volta da Meta com o "code": troca por token, lista Páginas e conclui a conexão. */
export async function GET(request: Request) {
  // Conectar uma conta social é ação exclusivamente interna - o mesmo
  // requireAdmin() já exigido pra iniciar (connect/finalize/pending/config)
  // precisa valer aqui também, senão qualquer sessão válida que capture um
  // state assinado (ex: navegador compartilhado) finaliza a conexão sozinha.
  const { session, error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_message") ?? url.searchParams.get("error");

  const state = stateRaw ? verifyState(stateRaw) : null;
  if (!state) {
    return Response.json({ error: "State inválido ou expirado, inicie a conexão novamente" }, { status: 400 });
  }
  if (oauthError || !code) {
    return redirectToClient(state.clientId, "error", oauthError ?? "Autorização cancelada");
  }

  const credentials = await getMetaAppCredentials();
  if (!credentials) {
    return redirectToClient(state.clientId, "error", "App da Meta não está mais configurado");
  }

  try {
    const shortLived = await exchangeCodeForUserToken(code, credentials.appId, credentials.appSecret, credentials.redirectUri);
    const longLived = await exchangeForLongLivedToken(shortLived.access_token, credentials.appId, credentials.appSecret);
    const [pages, metaUserId] = await Promise.all([
      listManagedPages(longLived.access_token),
      fetchMetaUserId(longLived.access_token),
    ]);

    if (pages.length === 0) {
      return redirectToClient(state.clientId, "error", "Nenhuma Página do Facebook encontrada para essa conta");
    }

    if (pages.length === 1) {
      await finalizeMetaConnection(state.clientId, session!.user.id, pages[0], metaUserId);
      return redirectToClient(state.clientId, "connected");
    }

    // Mais de uma Página: guarda a lista (com tokens) num cookie curto e
    // assinado, e deixa a pessoa escolher qual conectar nesse cliente.
    const encrypted = encryptSecret(JSON.stringify({ clientId: state.clientId, pages, metaUserId }));
    const response = redirectToClient(state.clientId, "pick");
    response.headers.append(
      "Set-Cookie",
      `${META_PENDING_COOKIE}=${encodeURIComponent(encrypted)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    );
    return response;
  } catch (err) {
    console.error("[meta/callback] erro", err);
    return redirectToClient(state.clientId, "error", err instanceof Error ? err.message : "Falha na conexão");
  }
}
