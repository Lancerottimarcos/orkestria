import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { PropostasView } from "@/components/propostas/PropostasView";

export default async function PropostasPage() {
  await requireModulePage("propostas");

  const [clients, opportunities, proposals] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, avatarUrl: true } }),
    prisma.salesOpportunity.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, contactName: true, email: true, phone: true, document: true, address: true },
    }),
    prisma.salesProposal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        kind: true,
        validUntil: true,
        createdAt: true,
        token: true,
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
        items: { select: { quantity: true, unitValue: true } },
      },
    }),
  ]);

  const serializedProposals = proposals.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    kind: p.kind,
    validUntil: p.validUntil ? p.validUntil.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    token: p.token,
    client: p.client,
    opportunity: p.opportunity,
    total: p.items.reduce((sum, i) => sum + i.quantity * i.unitValue, 0),
  }));

  return (
    <PropostasView
      clients={clients}
      opportunities={opportunities}
      initialProposals={serializedProposals}
    />
  );
}
