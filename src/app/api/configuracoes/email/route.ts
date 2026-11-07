import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { getEmailStatus, saveEmailCredentials } from "@/lib/email";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getEmailStatus();
  return Response.json(status);
}

/** body: { provider, apiKey?, fromAddress, fromName } - apiKey omitido mantém o valor já salvo. */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const provider = typeof body?.provider === "string" && body.provider ? body.provider : "resend";
  const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : undefined;
  const fromAddress = typeof body?.fromAddress === "string" ? body.fromAddress.trim() : undefined;
  const fromName = typeof body?.fromName === "string" ? body.fromName.trim() : undefined;

  try {
    await saveEmailCredentials({ provider, apiKey, fromAddress, fromName, updatedById: session.user.id });
    const status = await getEmailStatus();
    return Response.json(status);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao salvar credenciais" }, { status: 500 });
  }
}
