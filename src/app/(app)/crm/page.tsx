import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { CrmView } from "@/components/crm/CrmView";

const DEFAULT_STAGES = [
  { name: "Novo Lead", color: "#3b82f6" },
  { name: "Contato Feito", color: "#8b5cf6" },
  { name: "Proposta Enviada", color: "#eab308" },
  { name: "Negociação", color: "#f97316" },
  { name: "Fechado", color: "#3fb56f", isWon: true },
  { name: "Perdido", color: "#e14b4b", isLost: true },
];

async function ensureStages() {
  const count = await prisma.salesStage.count();
  if (count > 0) return;
  await prisma.salesStage.createMany({
    data: DEFAULT_STAGES.map((s, i) => ({ ...s, position: i })),
  });
}

export default async function CrmPage() {
  const session = await requireModulePage("crm");
  await ensureStages();

  const [stages, users] = await Promise.all([
    prisma.salesStage.findMany({
      orderBy: { position: "asc" },
      include: {
        opportunities: {
          orderBy: { position: "asc" },
          include: { responsible: true },
        },
      },
    }),
    prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  const serializedStages = stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    color: stage.color,
    position: stage.position,
    isWon: stage.isWon,
    isLost: stage.isLost,
    opportunities: stage.opportunities.map((o) => ({
      id: o.id,
      name: o.name,
      contactName: o.contactName,
      email: o.email,
      phone: o.phone,
      document: o.document,
      address: o.address,
      monthlyValue: o.monthlyValue,
      setupValue: o.setupValue,
      source: o.source,
      notes: o.notes,
      expectedCloseDate: o.expectedCloseDate ? o.expectedCloseDate.toISOString() : null,
      closedAt: o.closedAt ? o.closedAt.toISOString() : null,
      lostReason: o.lostReason,
      position: o.position,
      stageId: o.stageId,
      responsible: o.responsible,
      createdAt: o.createdAt.toISOString(),
    })),
  }));

  const userOptions = users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }));

  return (
    <CrmView
      initialStages={serializedStages}
      users={userOptions}
      isAdmin={session.user?.userType === "staff" && session.user?.role === "ADMIN"}
    />
  );
}
