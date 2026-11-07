import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { LinkCurtoView } from "@/components/ferramentas/LinkCurtoView";

export default async function LinkCurtoPage() {
  await requireModulePage("ferramentas");

  const links = await prisma.shortLink.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, targetUrl: true, clicks: true, createdAt: true },
  });

  const serialized = links.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }));

  return <LinkCurtoView initialLinks={serialized} />;
}
