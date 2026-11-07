import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Ferramentas de preview de link (WhatsApp, Slack, Telegram etc) fazem um GET
// automático antes do clique humano de verdade - sem filtrar isso, o contador
// infla com pré-visualização, não clique real. Heurística por User-Agent, não
// é 100% (só acurácia do contador, não trava nada).
const BOT_UA_RE = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slackbot|telegrambot|discordbot|linkedinbot|twitterbot|skypeuripreview|embedly|quora link preview|vkshare|w3c_validator/i;

export default async function ShortLinkRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const link = await prisma.shortLink.findUnique({ where: { slug }, select: { id: true, targetUrl: true } });
  if (!link) notFound();

  const userAgent = (await headers()).get("user-agent") ?? "";
  if (!BOT_UA_RE.test(userAgent)) {
    await prisma.shortLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
  }

  redirect(link.targetUrl);
}
