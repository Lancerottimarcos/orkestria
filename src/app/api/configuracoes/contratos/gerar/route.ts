import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { buildContractTemplate, TEMPLATE_KINDS } from "@/lib/contracts/templateFactory";

const answersSchema = z.object({
  kind: z.enum(["redes-sociais", "trafego-pago", "instagram", "social-trafego", "marketing-360", "criacao-conteudo"]),
  // Vigência e permanência
  permanenciaMeses: z.number().int().min(1).max(60).nullable(),
  multaRompimento: z.string().max(200),
  avisoRenovacaoDias: z.number().int().min(1).max(120),
  avisoCancelamentoDias: z.number().int().min(1).max(120),
  // Aprovações e produção
  envioAntecedenciaDias: z.number().int().min(1).max(30),
  prazoAprovacaoHoras: z.number().int().min(1).max(240),
  rodadasRevisao: z.number().int().min(1).max(10),
  silencioAprova: z.boolean(),
  primeiroPlanejamentoDias: z.number().int().min(1).max(60),
  alteracaoCronogramaHoras: z.number().int().min(1).max(240),
  artesAntecedenciaDias: z.number().int().min(1).max(30),
  eventosAntecedenciaDias: z.number().int().min(1).max(90),
  // Atendimento e relatórios
  canais: z.string().min(1).max(200),
  horarioAtendimento: z.string().min(1).max(300),
  prazoRespostaHoras: z.number().int().min(1).max(240),
  relatorioPeriodicidade: z.string().min(1).max(60),
  // Pagamento
  multaAtrasoPercent: z.number().min(0).max(20),
  jurosMesPercent: z.number().min(0).max(20),
  suspensaoPagamentoDias: z.number().int().min(1).max(90),
  // Proteções e suspensão
  confidencialidadeAnos: z.number().int().min(1).max(10),
  incidenteDadosHoras: z.number().int().min(1).max(240),
  comunicarOcorrenciaHoras: z.number().int().min(1).max(240),
  suspensaoMaxDias: z.number().int().min(7).max(365),
  retomadaDias: z.number().int().min(1).max(90),
});

/**
 * Fluxo guiado dos modelos prontos: a pessoa responde as perguntas (TUDO
 * que é alterável no texto) e o contrato inteiro é gerado/atualizado pela
 * fábrica, já no formato legal design. Upsert por nome do modelo.
 */
export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = answersSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, ...answers } = parsed.data;
  const template = buildContractTemplate(kind, answers);

  const existing = await prisma.contractTemplate.findFirst({ where: { name: template.name } });
  const saved = existing
    ? await prisma.contractTemplate.update({ where: { id: existing.id }, data: { bodyJson: template.bodyJson } })
    : await prisma.contractTemplate.create({ data: template });

  return Response.json({ ...saved, kindName: TEMPLATE_KINDS.find((k) => k.kind === kind)?.name });
}
