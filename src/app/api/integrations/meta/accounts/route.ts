import { requireModule, requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/**
 * Lista contas Instagram/Facebook conectadas (sem tokens).
 * Com clientId: contas desse cliente. Sem clientId: todas (só admin), pro
 * painel geral de Configurações → Integrações.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");

  if (!clientId) {
    const { error } = await requireAdmin();
    if (error) return error;
    const accounts = await prisma.socialAccount.findMany({
      select: {
        id: true,
        platform: true,
        name: true,
        status: true,
        lastError: true,
        tokenExpiresAt: true,
        connectedAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: [{ client: { name: "asc" } }, { platform: "asc" }],
    });
    return Response.json(accounts);
  }

  const { error } = await requireModule("clientes");
  if (error) return error;

  const accounts = await prisma.socialAccount.findMany({
    where: { clientId },
    select: {
      id: true,
      platform: true,
      name: true,
      status: true,
      lastError: true,
      tokenExpiresAt: true,
      connectedAt: true,
    },
    orderBy: { platform: "asc" },
  });
  return Response.json(accounts);
}
