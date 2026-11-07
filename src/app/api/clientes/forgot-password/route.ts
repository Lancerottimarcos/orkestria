import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/schemas";
import { isRateLimited, clientIp } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const portalEmail = parsed.data.email.toLowerCase().trim();
  if (isRateLimited(`forgot:ip:${clientIp(request)}`, 10, 15 * 60 * 1000) || isRateLimited(`forgot:email:${portalEmail}`, 3, 15 * 60 * 1000)) {
    // Mesma resposta de sempre - não denuncia que foi bloqueado por rate limit.
    return Response.json({ ok: true });
  }
  const client = await prisma.client.findUnique({ where: { portalEmail } });
  if (client && client.portalEnabled) {
    await prisma.client.update({
      where: { id: client.id },
      data: { passwordResetRequestedAt: new Date() },
    });
  }

  // Always return the same response, whether or not the email exists,
  // so this endpoint can't be used to enumerate valid accounts.
  return Response.json({ ok: true });
}
