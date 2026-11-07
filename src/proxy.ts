import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PREFIXES = [
  "/login",
  "/portal/login",
  "/esqueci-senha",
  "/aprovacao",
  "/contrato",
  "/formulario",
  "/proposta",
  "/l/",
  "/p/",
  "/politica-de-privacidade",
  "/termos-de-uso",
  "/exclusao-de-usuario",
  "/solicitacoes-exclusao-dados",
  "/api",
  "/_next",
  "/uploads",
  "/favicon.ico",
  "/icon.svg",
];

const AUTH_COOKIES = [
  "orkestrya.session-token",
  "__Secure-orkestrya.session-token",
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function getBaseUrl(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const hasSession = AUTH_COOKIES.some((name) => req.cookies.has(name));

  if (!hasSession) {
    const isPortal = pathname.startsWith("/portal");
    const loginPath = isPortal ? "/portal/login" : "/login";
    const redirectUrl = new URL(loginPath, getBaseUrl(req));
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|uploads/).*)"],
};

