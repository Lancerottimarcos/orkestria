import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getAiStatus, saveAiCredentials } from "@/lib/ai";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getAiStatus();
  return Response.json(status);
}

/** body: { provider, apiKey?, model? } - apiKey omitido mantém o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const provider = typeof body?.provider === "string" && body.provider ? body.provider : "anthropic";
  const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined;
  const model = typeof body?.model === "string" ? body.model.trim() : undefined;

  try {
    await saveAiCredentials({ provider, apiKey, model, updatedById: session.user.id });
    const status = await getAiStatus();
    return Response.json(status);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao salvar credenciais" }, { status: 500 });
  }
}
