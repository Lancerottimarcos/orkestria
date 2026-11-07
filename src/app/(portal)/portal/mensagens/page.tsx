import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortalChatWidget } from "@/components/chat/PortalChatWidget";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function PortalMensagensPage() {
  const session = await auth();
  if (!session?.user.clientId) redirect("/portal/login");

  const staff = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Mensagens" description="Fale direto com a equipe sobre suas demandas" />
      <PortalChatWidget mentionableUsers={staff} />
    </div>
  );
}
