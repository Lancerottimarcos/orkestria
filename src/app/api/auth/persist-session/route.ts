import { cookies } from "next/headers";
import { decode, encode } from "@auth/core/jwt";
import { auth, SESSION_COOKIE_NAME, REMEMBER_ME_MAX_AGE, SESSION_SHORT_MAX_AGE } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Sem sessão ativa" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const remember = body?.remember === true;

  const store = await cookies();
  const current = store.get(SESSION_COOKIE_NAME);
  if (!current) {
    return Response.json({ error: "Cookie de sessão não encontrado" }, { status: 400 });
  }

  const secret = process.env.AUTH_SECRET || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const maxAge = remember ? REMEMBER_ME_MAX_AGE : SESSION_SHORT_MAX_AGE;
  const payload = await decode({ token: current.value, secret, salt: SESSION_COOKIE_NAME });
  if (!payload) {
    return Response.json({ error: "Sessão inválida" }, { status: 400 });
  }
  const reissued = await encode({ token: payload, secret, salt: SESSION_COOKIE_NAME, maxAge });

  const isCookieSecure = process.env.AUTH_COOKIE_INSECURE !== "1";
  const cookieSameSite = (process.env.AUTH_COOKIE_SAME_SITE as "lax" | "none") || (isCookieSecure ? "none" : "lax");

  store.set(SESSION_COOKIE_NAME, reissued, {
    httpOnly: true,
    sameSite: cookieSameSite,
    path: "/",
    secure: isCookieSecure,
    ...(remember ? { maxAge } : {}),
  });

  return Response.json({ ok: true });
}
