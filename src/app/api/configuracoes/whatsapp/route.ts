import { requireAdmin } from "@/lib/authz";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getWhatsAppStatus, saveWhatsAppCredentials } from "@/lib/whatsapp";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const status = await getWhatsAppStatus();
  return Response.json(status);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const phoneNumberId = typeof body?.phoneNumberId === "string" ? body.phoneNumberId.trim() : "";
  if (!phoneNumberId) {
    return Response.json({ error: "Informe o Phone Number ID" }, { status: 400 });
  }
  const accessToken = typeof body?.accessToken === "string" && body.accessToken.trim() ? body.accessToken.trim() : undefined;
  const verifyToken = typeof body?.verifyToken === "string" ? body.verifyToken.trim() : undefined;
  const appSecret = typeof body?.appSecret === "string" && body.appSecret.trim() ? body.appSecret.trim() : undefined;
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : undefined;

  // App Secret é o que valida a assinatura de todo webhook recebido
  // (src/app/api/whatsapp/webhook/route.ts) - sem ele, o recebimento de
  // mensagens fica desligado silenciosamente (todo POST do Meta é rejeitado
  // com 401) mesmo com telefone/token configurados e o envio funcionando
  // normalmente, então o admin não percebe que a caixa de entrada está morta.
  const existing = await prisma.whatsAppConfig.findUnique({ where: { id: "whatsapp" }, select: { appSecretEnc: true } });
  if (!appSecret && !existing?.appSecretEnc && !process.env.WHATSAPP_APP_SECRET) {
    return Response.json({ error: "Informe o App Secret - sem ele, o recebimento de mensagens fica desligado" }, { status: 400 });
  }

  try {
    await saveWhatsAppCredentials({ phoneNumberId, accessToken, verifyToken, appSecret, displayName, updatedById: session.user.id });
    const status = await getWhatsAppStatus();
    return Response.json(status);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha ao salvar credenciais" }, { status: 500 });
  }
}
