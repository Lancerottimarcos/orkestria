import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { buildProposalTemplate, PROPOSAL_TEMPLATE_KINDS } from "@/lib/proposals/proposalTemplateFactory";

const bodySchema = z.object({
  kind: z.enum(["redes-sociais", "trafego-pago", "marketing-360", "criacao-conteudo", "geral"]),
});

/**
 * Gera (ou atualiza, se já existir com o mesmo nome) um dos modelos prontos
 * de proposta comercial - sem questionário, diferente do fluxo guiado de
 * contrato: o texto já sai pronto pra usar ou ajustar depois no editor.
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { kind } = parsed.data;
  const template = buildProposalTemplate(kind);

  const existing = await prisma.proposalTemplate.findFirst({ where: { sourceKind: kind } });
  const saved = existing
    ? await prisma.proposalTemplate.update({ where: { id: existing.id }, data: { bodyJson: template.bodyJson } })
    : await prisma.proposalTemplate.create({ data: { ...template, sourceKind: kind } });

  return Response.json({ ...saved, kindName: PROPOSAL_TEMPLATE_KINDS.find((k) => k.kind === kind)?.name });
}
