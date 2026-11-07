import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getYouTubeAppStatus, saveYouTubeAppCredentials, getYouTubeRedirectUri } from "@/lib/youtubeConfig";

/** Status atual do app do YouTube configurado (nunca devolve a chave secreta). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getYouTubeAppStatus();
  return Response.json({ ...status, redirectUri: getYouTubeRedirectUri() });
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
    await saveYouTubeAppCredentials({ clientId, clientSecret, updatedById: session.user.id });
    const status = await getYouTubeAppStatus();
    return Response.json({ ...status, redirectUri: getYouTubeRedirectUri() });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar credenciais" },
      { status: 500 },
    );
  }
}
