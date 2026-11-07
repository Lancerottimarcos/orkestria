import { requireAdmin } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import { LINKEDIN_PENDING_COOKIE } from "@/lib/linkedinConnection";
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

/** Lista as Company Pages encontradas na última tentativa de conexão, sem expor o token. */
export async function GET(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const pending = readPendingCookie(request);
  if (!pending || pending.clientId !== clientId) {
    return Response.json({ orgs: [] });
  }
  return Response.json({
    orgs: pending.orgs.map((o) => ({ organizationId: o.organizationId, name: o.name })),
  });
}
