import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getMetaAppStatus, saveMetaAppCredentials, getMetaRedirectUri } from "@/lib/metaConfig";

/** Status atual do app da Meta configurado (nunca devolve a chave secreta). */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getMetaAppStatus();
  return Response.json({ ...status, redirectUri: getMetaRedirectUri() });
}

/** Salva o App ID / Chave secreta. body: { appId, appSecret? } - appSecret omitido mantém o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const appId = typeof body?.appId === "string" ? body.appId.trim() : "";
  const appSecret = typeof body?.appSecret === "string" && body.appSecret.trim() ? body.appSecret.trim() : undefined;

  if (!appId) {
    return Response.json({ error: "Informe o App ID" }, { status: 400 });
  }

  try {
    await saveMetaAppCredentials({ appId, appSecret, updatedById: session.user.id });
    const status = await getMetaAppStatus();
    return Response.json({ ...status, redirectUri: getMetaRedirectUri() });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Falha ao salvar credenciais" },
      { status: 500 },
    );
  }
}
