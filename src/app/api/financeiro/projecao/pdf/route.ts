import { requireModule } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeCashFlowProjection } from "@/lib/cashFlowProjection";
import { renderDrePdf } from "@/lib/renderDrePdf";

export async function GET() {
  const { error } = await requireModule("financeiro");
  if (error) return error;

  const [months, company] = await Promise.all([
    computeCashFlowProjection(3, 3),
    prisma.companySettings.findFirst({ select: { name: true } }),
  ]);

  const buffer = await renderDrePdf(months, company?.name ?? "Minha Agência");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=dre-simplificado.pdf",
    },
  });
}
