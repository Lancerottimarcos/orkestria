import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ContratosView, type ContractRow, type TemplateRow } from "@/components/contratos/ContratosView";

const RENEWAL_SOON_MS = 30 * 24 * 60 * 60 * 1000;

type ServiceRecord = {
  id: string;
  name: string;
  value: number;
  period: ContractRow["period"];
  startDate: Date;
  renewalDate: Date | null;
  contractUrl: string | null;
  contractBodyJson: string | null;
  signedAt: Date | null;
  signerName: string | null;
  signerFont: string | null;
  agencySignedAt: Date | null;
  agencySignerName: string | null;
  createdAt: Date;
  client: { id: string; name: string; avatarUrl: string | null };
  proposal: { token: string; title: string } | null;
};

/** Serializa e classifica renovação - fora do componente porque usa o relógio. */
function buildRows(services: ServiceRecord[]): ContractRow[] {
  const now = Date.now();
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    value: s.value,
    period: s.period,
    startDate: s.startDate.toISOString(),
    renewalDate: s.renewalDate ? s.renewalDate.toISOString() : null,
    renewalSoon: !!s.renewalDate && s.renewalDate.getTime() - now < RENEWAL_SOON_MS && s.renewalDate.getTime() >= now,
    renewalOverdue: !!s.renewalDate && s.renewalDate.getTime() < now,
    hasContract: !!(s.contractUrl || s.contractBodyJson),
    signedAt: s.signedAt ? s.signedAt.toISOString() : null,
    signerName: s.signerName,
    signerFont: s.signerFont,
    agencySignedAt: s.agencySignedAt ? s.agencySignedAt.toISOString() : null,
    agencySignerName: s.agencySignerName,
    createdAt: s.createdAt.toISOString(),
    client: s.client,
    proposalToken: s.proposal?.token ?? null,
    proposalTitle: s.proposal?.title ?? null,
  }));
}

/**
 * Central de contratos: tudo que foi contratado (assinado ou não), o que
 * precisa da assinatura da agência, o que ainda espera o cliente, os
 * ativos, renovações próximas e os modelos - num lugar só.
 */
export default async function ContratosPage() {
  await requireModulePage("clientes");

  const [services, templates] = await Promise.all([
    prisma.contractedService.findMany({
      orderBy: [{ signedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        value: true,
        period: true,
        startDate: true,
        renewalDate: true,
        contractUrl: true,
        contractBodyJson: true,
        signedAt: true,
        signerName: true,
        signerFont: true,
        agencySignedAt: true,
        agencySignerName: true,
        createdAt: true,
        client: { select: { id: true, name: true, avatarUrl: true } },
        proposal: { select: { token: true, title: true } },
      },
    }),
    prisma.contractTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, updatedAt: true, isDefault: true },
    }),
  ]);

  const rows = buildRows(services);

  const templateRows: TemplateRow[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    updatedAt: t.updatedAt.toISOString(),
    isDefault: t.isDefault,
  }));

  return <ContratosView initialContracts={rows} templates={templateRows} />;
}
