import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ServicesView } from "@/components/services/ServicesView";

export default async function ServicosPage() {
  await requireModulePage("servicos");

  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  });

  return <ServicesView initialServices={services} />;
}
