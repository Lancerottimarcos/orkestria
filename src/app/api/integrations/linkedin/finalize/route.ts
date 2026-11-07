import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import { finalizeLinkedInConnection, LINKEDIN_PENDING_COOKIE } from "@/lib/linkedinConnection";
import type { LinkedInOrganization, LinkedInTokenResult } from "@/lib/linkedin";

function readPendingCookie(
  request: Request,
): { clientId: string; orgs: LinkedInOrganization[]; token: LinkedInTokenResult } | null {
  const cookie = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${LINKEDIN_PENDING_COOKIE}=`));
  if (!cookie) return null;
  try {
    const raw = decodeURIComponent(cookie.slice(LINKEDIN_PENDING_COOKIE.length + 1));
    return JSON.parse(decryptSecret(raw));
  } catch {
    return null;
  }
}

/** Conclui a conexão com a Company Page escolhida na tela de seleção. body: { clientId, organizationId } */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { clientId, organizationId } = body as { clientId?: string; organizationId?: string };
  if (!clientId || !organizationId) {
    return Response.json({ error: "clientId e organizationId são obrigatórios" }, { status: 400 });
  }

  const pending = readPendingCookie(request);
  if (!pending || pending.clientId !== clientId) {
    return Response.json({ error: "Sessão de conexão expirada, inicie novamente" }, { status: 400 });
  }
  const org = pending.orgs.find((o) => o.organizationId === organizationId);
  if (!org) {
    return Response.json({ error: "Página não encontrada na lista" }, { status: 404 });
  }

  await finalizeLinkedInConnection(clientId, session.user.id, org, pending.token);

  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${LINKEDIN_PENDING_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  return response;
}
