import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ClientVanityLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const client = await prisma.client.findUnique({
    where: { portalSlug: slug },
    select: { name: true, portalEnabled: true },
  });

  if (!client || !client.portalEnabled) {
    redirect("/portal/login");
  }

  // Não inclui o e-mail de login aqui: essa página é pública e sem
  // autenticação - qualquer um que souber o nome da empresa acertaria o
  // slug, então colocar o e-mail na query string vazaria o login exato de
  // outro cliente pra quem só sabe o nome da agência atendida.
  const search = new URLSearchParams();
  search.set("empresa", client.name);

  redirect(`/portal/login?${search.toString()}`);
}
