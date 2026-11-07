import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getPaymentStatus, savePaymentCredentials } from "@/lib/payment";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getPaymentStatus();
  return Response.json(status);
}

/** body: { provider, apiKey?, webhookToken?, sandbox } - apiKey/webhookToken omitidos mantêm o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const provider = typeof body?.provider === "string" && body.provider ? body.provider : "asaas";
  const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined;
  const webhookToken = typeof body?.webhookToken === "string" && body.webhookToken.trim() ? body.webhookToken.trim() : undefined;
  const sandbox = body?.sandbox !== false;

  try {
    await savePaymentCredentials({ provider, apiKey, webhookToken, sandbox, updatedById: session.user.id });
    const status = await getPaymentStatus();
    return Response.json(status);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao salvar credenciais" }, { status: 500 });
  }
}
