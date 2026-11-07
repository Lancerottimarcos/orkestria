import { requireAdmin } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import { META_PENDING_COOKIE } from "@/lib/metaConnection";
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

/** Lista as Páginas encontradas na última tentativa de conexão, sem expor os tokens. */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const pending = readPendingCookie(request);
  if (!pending || pending.clientId !== clientId) {
    return Response.json({ pages: [] });
  }
  return Response.json({
    pages: pending.pages.map((p) => ({
      id: p.id,
      name: p.name,
      hasInstagram: Boolean(p.instagram_business_account),
      instagramUsername: p.instagram_business_account?.username ?? null,
    })),
  });
}
