import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { resolveClientAccess } from "@/lib/clientAccess";
import { Avatar } from "@/components/ui/Avatar";
import { EstrategiaView } from "@/components/strategy/EstrategiaView";

type Params = { params: Promise<{ id: string }> };

export default async function EstrategiaPage({ params }: Params) {
  await requireModulePage("clientes");
  const { id } = await params;

  // Mesma checagem de clientes/[id]/page.tsx - a Central Estratégica é a
  // mesma área "Clientes" que já restringe por clientAccess, não pode ficar
  // de fora só porque é uma subpágina.
  const session = await auth();
  if (session?.user && session.user.role !== "ADMIN") {
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { clientAccess: true } });
    const visibleClientIds = resolveClientAccess(session.user.role, currentUser?.clientAccess);
    if (visibleClientIds !== null && !visibleClientIds.includes(id)) notFound();
  }

  const client = await prisma.client.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!client) notFound();

  return (
    <div>
      <Link
        href={`/clientes/${client.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Voltar para {client.name}
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <Avatar name={client.name} url={client.avatarUrl} size={56} className="ring-4 ring-surface shadow-sm" />
        <div>
          <p className="text-[13px] font-medium text-muted">Central Estratégica</p>
          <h1 className="text-[28px] sm:text-[32px] font-light tracking-tight leading-[1.1] text-ink">
            {client.name}
          </h1>
        </div>
      </div>

      <EstrategiaView clientId={client.id} />
    </div>
  );
}
