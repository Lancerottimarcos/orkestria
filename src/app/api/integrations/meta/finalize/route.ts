import { auth } from "@/auth";
import { requireAdmin } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import { finalizeMetaConnection, META_PENDING_COOKIE } from "@/lib/metaConnection";
import type { ManagedPage } from "@/lib/meta";

function readPendingCookie(request: Request): { clientId: string; pages: ManagedPage[]; metaUserId: string } | null {
  const cookie = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith(`${META_PENDING_COOKIE}=`));
  if (!cookie) return null;
  try {
    const raw = decodeURIComponent(cookie.slice(META_PENDING_COOKIE.length + 1));
    return JSON.parse(decryptSecret(raw));
  } catch {
    return null;
  }
}

/** Conclui a conexão com a Página escolhida na tela de seleção. body: { clientId, pageId } */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { clientId, pageId } = body as { clientId?: string; pageId?: string };
  if (!clientId || !pageId) {
    return Response.json({ error: "clientId e pageId são obrigatórios" }, { status: 400 });
  }

  const pending = readPendingCookie(request);
  if (!pending || pending.clientId !== clientId) {
    return Response.json({ error: "Sessão de conexão expirada, inicie novamente" }, { status: 400 });
  }
  const page = pending.pages.find((p) => p.id === pageId);
  if (!page) {
    return Response.json({ error: "Página não encontrada na lista" }, { status: 404 });
  }

  await finalizeMetaConnection(clientId, session.user.id, page, pending.metaUserId);

  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", `${META_PENDING_COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  return response;
}
