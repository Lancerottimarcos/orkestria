import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

function syncAuthUrl(req: NextRequest | Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "localhost:3000";
  const cleanHost = host.includes(":") && !host.includes("localhost") && !host.includes("127.0.0.1")
    ? host.split(":")[0]
    : host;

  const isLocal = cleanHost.includes("localhost") || cleanHost.includes("127.0.0.1");
  const proto = isLocal ? "http" : "https";

  const publicUrl = `${proto}://${cleanHost}`;
  process.env.AUTH_URL = publicUrl;
  process.env.NEXTAUTH_URL = publicUrl;
}

export async function GET(req: NextRequest) {
  syncAuthUrl(req);
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  syncAuthUrl(req);
  return handlers.POST(req);
}
