import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getLinkedInAppStatus, saveLinkedInAppCredentials, getLinkedInRedirectUri } from "@/lib/linkedinConfig";

/** Status atual do app do LinkedIn configurado (nunca devolve a chave secreta). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getLinkedInAppStatus();
  return Response.json({ ...status, redirectUri: getLinkedInRedirectUri() });
}

/** Salva o Client ID / Chave secreta. body: { clientId, clientSecret? } - clientSecret omitido mantém o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clientId = typeof body?.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret =
    typeof body?.clientSecret === "string" && body.clientSecret.trim() ? body.clientSecret.trim() : undefined;

  if (!clientId) {
    return Response.json({ error: "Informe o Client ID" }, { status: 400 });
  }

  try {
    await saveLinkedInAppCredentials({ clientId, clientSecret, updatedById: session.user.id });
    const status = await getLinkedInAppStatus();
    return Response.json({ ...status, redirectUri: getLinkedInRedirectUri() });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar credenciais" },
      { status: 500 },
    );
  }
}
