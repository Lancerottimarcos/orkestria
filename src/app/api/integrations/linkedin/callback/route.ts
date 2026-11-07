import { requireAdmin } from "@/lib/authz";
import { encryptSecret } from "@/lib/crypto";
import { exchangeCodeForLinkedInToken, fetchAdministeredOrganizations } from "@/lib/linkedin";
import { getLinkedInAppCredentials } from "@/lib/linkedinConfig";
import { verifyLinkedInState, finalizeLinkedInConnection, LINKEDIN_PENDING_COOKIE } from "@/lib/linkedinConnection";

function redirectToClient(clientId: string, status: "connected" | "error" | "pick", detail?: string) {
  const url = new URL(`/clientes/${clientId}`, process.env.AUTH_URL ?? "http://localhost:3000");
  url.searchParams.set("linkedin", status);
  if (detail) url.searchParams.set("linkedinDetail", detail);
  return Response.redirect(url.toString(), 302);
}

/** Volta do LinkedIn com o "code": troca por token, lista Company Pages e conclui a conexão. */
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
  const oauthError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

  const state = stateRaw ? verifyLinkedInState(stateRaw) : null;
  if (!state) {
    return Response.json({ error: "State inválido ou expirado, inicie a conexão novamente" }, { status: 400 });
  }
  if (oauthError || !code) {
    return redirectToClient(state.clientId, "error", oauthError ?? "Autorização cancelada");
  }

  const credentials = await getLinkedInAppCredentials();
  if (!credentials) {
    return redirectToClient(state.clientId, "error", "App do LinkedIn não está mais configurado");
  }

  try {
    const token = await exchangeCodeForLinkedInToken(code, credentials.clientId, credentials.clientSecret, credentials.redirectUri);
    const orgs = await fetchAdministeredOrganizations(token.access_token);

    if (orgs.length === 0) {
      return redirectToClient(
        state.clientId,
        "error",
        "Nenhuma Company Page encontrada - a conta precisa ser administradora aprovada de uma página",
      );
    }

    if (orgs.length === 1) {
      await finalizeLinkedInConnection(state.clientId, session!.user.id, orgs[0], token);
      return redirectToClient(state.clientId, "connected");
    }

    // Mais de uma Company Page: guarda a lista (com o token) num cookie curto
    // e assinado, e deixa a pessoa escolher qual conectar nesse cliente.
    const encrypted = encryptSecret(JSON.stringify({ clientId: state.clientId, orgs, token }));
    const response = redirectToClient(state.clientId, "pick");
    response.headers.append(
      "Set-Cookie",
      `${LINKEDIN_PENDING_COOKIE}=${encodeURIComponent(encrypted)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    );
    return response;
  } catch (err) {
    console.error("[linkedin/callback] erro", err);
    return redirectToClient(state.clientId, "error", err instanceof Error ? err.message : "Falha na conexão");
  }
}
