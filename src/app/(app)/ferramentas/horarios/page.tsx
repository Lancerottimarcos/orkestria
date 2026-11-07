import { requireModulePage } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeBestPostTimes } from "@/lib/bestPostTimes";
import { MelhoresHorariosView } from "@/components/ferramentas/MelhoresHorariosView";

type Props = { searchParams: Promise<{ client?: string }> };

export default async function HorariosPage({ searchParams }: Props) {
  await requireModulePage("ferramentas");
  const { client: clientId } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, avatarUrl: true },
  });

  const realData = clientId ? await computeBestPostTimes(clientId) : [];

  return <MelhoresHorariosView clients={clients} selectedClientId={clientId ?? ""} realData={realData} />;
}
