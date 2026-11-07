import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getTikTokAppStatus, saveTikTokAppCredentials, getTikTokRedirectUri } from "@/lib/tiktokConfig";

/** Status atual do app do TikTok configurado (nunca devolve a chave secreta). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getTikTokAppStatus();
  return Response.json({ ...status, redirectUri: getTikTokRedirectUri() });
}

/** Salva o Client Key / Chave secreta. body: { clientKey, clientSecret? } - clientSecret omitido mantém o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const clientKey = typeof body?.clientKey === "string" ? body.clientKey.trim() : "";
  const clientSecret =
    typeof body?.clientSecret === "string" && body.clientSecret.trim() ? body.clientSecret.trim() : undefined;

  if (!clientKey) {
    return Response.json({ error: "Informe o Client Key" }, { status: 400 });
  }

  try {
    await saveTikTokAppCredentials({ clientKey, clientSecret, updatedById: session.user.id });
    const status = await getTikTokAppStatus();
    return Response.json({ ...status, redirectUri: getTikTokRedirectUri() });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar credenciais" },
      { status: 500 },
    );
  }
}
