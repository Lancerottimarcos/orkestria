import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

/**
 * Cenário de demonstração comercial: três empresas fictícias em pontos
 * diferentes da jornada, pra mostrar o sistema de ponta a ponta.
 *
 *  1. Bella Moda Boutique - contrato ATIVO (cliente assinou e agência
 *     contra-assinou) com o modelo Redes Sociais + Tráfego Pago.
 *  2. Sabor da Serra Restaurante - cliente assinou, aguardando a
 *     contra-assinatura da agência (pra assinar ao vivo na demo).
 *  3. Clínica Vitalis - proposta ENVIADA, pronta pra abrir o link e
 *     mostrar o processo completo: aceitar → contrato → assinar.
 *
 * O aceite e a assinatura passam pelas rotas públicas reais (HTTP), então
 * toda a automação dispara de verdade: cliente criado no CRM, contrato
 * gerado, financeiro lançado, quadro e projeto abertos, portal provisionado.
 * Idempotente: roda de novo sem duplicar nada.
 *
 * Uso: DEMO_BASE_URL=https://orkestrya.com.br npx tsx scripts/seed-demo-showcase.ts
 * (sem a env, usa http://localhost:3100)
 */

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3100";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type DemoCompany = {
  opportunity: {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    document: string;
    address: string;
  };
  proposal: {
    title: string;
    contactName: string;
    notes: string;
    setupFee: number | null;
    paymentMethods: string;
    item: { description: string; scope: string; unitValue: number };
  };
  /** Nome do ContractTemplate cujo corpo entra no contrato desta empresa */
  templateName: string;
  /** null = fica só como proposta enviada (o link teste da demo) */
  sign: { signerName: string; signerDocument: string; signerFont: string; agencySigns: boolean } | null;
};

const COMPANIES: DemoCompany[] = [
  {
    opportunity: {
      name: "Bella Moda Boutique",
      contactName: "Mariana Duarte",
      email: "mariana@bellamodaboutique.com.br",
      phone: "(11) 98765-1020",
      document: "23.456.789/0001-10",
      address: "Rua Oscar Freire, 820, Jardins, São Paulo - SP",
    },
    proposal: {
      title: "Redes Sociais + Tráfego Pago - Bella Moda",
      contactName: "Mariana Duarte",
      notes: "Estratégia integrada de conteúdo e anúncios pra lançamentos de coleção e fluxo de loja.",
      setupFee: 500,
      paymentMethods: "PIX,CARD",
      item: {
        description: "Gestão de Redes Sociais + Tráfego Pago",
        scope:
          "Linha editorial e calendário mensal, 16 posts + 12 stories por mês, campanhas Meta Ads de coleção e remarketing, relatório mensal de conteúdo e mídia.",
        unitValue: 3800,
      },
    },
    templateName: "Gestão de Redes Sociais + Tráfego Pago",
    sign: { signerName: "Mariana Duarte", signerDocument: "312.456.789-01", signerFont: "elegante", agencySigns: true },
  },
  {
    opportunity: {
      name: "Sabor da Serra Restaurante",
      contactName: "Ricardo Nogueira",
      email: "ricardo@sabordaserra.com.br",
      phone: "(31) 99654-3021",
      document: "34.567.890/0001-21",
      address: "Av. Afonso Pena, 1500, Centro, Belo Horizonte - MG",
    },
    proposal: {
      title: "Gestão de Instagram - Sabor da Serra",
      contactName: "Ricardo Nogueira",
      notes: "Perfil com foco em cardápio sazonal, bastidores da cozinha e reservas pelo Direct.",
      setupFee: null,
      paymentMethods: "PIX,BOLETO",
      item: {
        description: "Gestão de Instagram",
        scope:
          "Linha editorial do perfil, 12 posts + 16 stories + 4 reels por mês, otimização de biografia e destaques, monitoramento de comentários e relatório mensal.",
        unitValue: 1900,
      },
    },
    templateName: "Gestão de Instagram",
    sign: { signerName: "Ricardo Nogueira", signerDocument: "423.567.890-12", signerFont: "fluida", agencySigns: false },
  },
  {
    opportunity: {
      name: "Clínica Vitalis",
      contactName: "Dra. Camila Freitas",
      email: "camila@clinicavitalis.com.br",
      phone: "(21) 98123-4455",
      document: "45.678.901/0001-32",
      address: "Rua Visconde de Pirajá, 414, Ipanema, Rio de Janeiro - RJ",
    },
    proposal: {
      title: "Marketing 360 - Clínica Vitalis",
      contactName: "Dra. Camila Freitas",
      notes: "Presença digital completa da clínica: redes, campanhas de captação e materiais impressos da recepção.",
      setupFee: 1500,
      paymentMethods: "PIX,BOLETO,TRANSFER",
      item: {
        description: "Gestão de Marketing 360",
        scope:
          "Plano de marketing integrado on e off: redes sociais, campanhas Meta e Google, materiais gráficos da clínica e acompanhamento mensal de indicadores.",
        unitValue: 7500,
      },
    },
    templateName: "Gestão de Marketing 360",
    sign: null,
  },
];

async function ensureStage() {
  const existing = await prisma.salesStage.findFirst({ orderBy: { position: "asc" } });
  if (existing) return existing;
  return prisma.salesStage.create({ data: { name: "Negociação", position: 0 } });
}

async function main() {
  const stage = await ensureStage();

  // Dados mínimos da agência pro contrato não sair vazio na CONTRATADA
  const company = await prisma.companySettings.findFirst();
  if (company && company.name === "Minha Agência") {
    await prisma.companySettings.update({
      where: { id: company.id },
      data: { name: "Portal Publicitário", email: company.email ?? "felipe@portalpublicitario.com.br" },
    });
    console.log("Dados da agência: nome e e-mail preenchidos (complete CNPJ, endereço e chave PIX no perfil)");
  }

  const links: string[] = [];

  for (const demo of COMPANIES) {
    // 1. Oportunidade no CRM (upsert por nome)
    let opportunity = await prisma.salesOpportunity.findFirst({ where: { name: demo.opportunity.name } });
    if (!opportunity) {
      opportunity = await prisma.salesOpportunity.create({
        data: { ...demo.opportunity, stageId: stage.id, position: 99 },
      });
      console.log(`Oportunidade criada: ${demo.opportunity.name}`);
    }

    // 2. Proposta enviada (upsert por título)
    let proposal = await prisma.salesProposal.findFirst({ where: { title: demo.proposal.title } });
    if (!proposal) {
      proposal = await prisma.salesProposal.create({
        data: {
          title: demo.proposal.title,
          status: "SENT",
          contactName: demo.proposal.contactName,
          notes: demo.proposal.notes,
          validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          opportunityId: opportunity.id,
          paymentCondition: "CASH",
          setupFee: demo.proposal.setupFee,
          paymentMethods: demo.proposal.paymentMethods,
          items: {
            create: [
              {
                description: demo.proposal.item.description,
                scope: demo.proposal.item.scope,
                quantity: 1,
                unitValue: demo.proposal.item.unitValue,
                position: 0,
                billingType: "MONTHLY",
              },
            ],
          },
        },
      });
      console.log(`Proposta criada: ${demo.proposal.title}`);
    }

    // 3. Jornada via rotas públicas reais (aceite + assinatura do cliente)
    if (demo.sign) {
      const current = await prisma.salesProposal.findUnique({ where: { id: proposal.id }, select: { status: true } });
      if (current?.status === "SENT") {
        const accept = await fetch(`${BASE}/api/proposta/${proposal.token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "accept", signerName: demo.sign.signerName }),
        });
        if (!accept.ok) throw new Error(`Aceite falhou pra ${demo.proposal.title}: ${accept.status}`);
        console.log(`Proposta aceita: ${demo.proposal.title}`);
      }

      const pending = await prisma.contractedService.findFirst({ where: { proposalId: proposal.id, signedAt: null } });
      if (pending) {
        const sign = await fetch(`${BASE}/api/proposta/${proposal.token}/contrato`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signerName: demo.sign.signerName,
            signerDocument: demo.sign.signerDocument,
            signerFont: demo.sign.signerFont,
          }),
        });
        if (!sign.ok) throw new Error(`Assinatura falhou pra ${demo.proposal.title}: ${sign.status}`);
        console.log(`Contrato assinado pelo cliente: ${demo.sign.signerName}`);
      }

      // 4. Corpo do contrato = modelo específico do serviço (o pipeline usa o
      //    modelo padrão; aqui garantimos o modelo certo pra cada empresa)
      const template = await prisma.contractTemplate.findFirst({ where: { name: demo.templateName } });
      if (template) {
        await prisma.contractedService.updateMany({
          where: { proposalId: proposal.id },
          data: { contractBodyJson: template.bodyJson },
        });
      }

      // 5. Contra-assinatura da agência (só na empresa de contrato ativo)
      if (demo.sign.agencySigns) {
        const updated = await prisma.contractedService.updateMany({
          where: { proposalId: proposal.id, signedAt: { not: null }, agencySignedAt: null },
          data: { agencySignedAt: new Date(), agencySignerName: "Felipe Martins" },
        });
        if (updated.count > 0) console.log(`Contra-assinado pela agência: ${demo.proposal.title}`);
      }

      links.push(`${demo.opportunity.name} (contrato): ${BASE}/contrato/${proposal.token}`);
    } else {
      links.push(`${demo.opportunity.name} (PROPOSTA PRONTA PRA ENVIAR): ${BASE}/proposta/${proposal.token}`);
    }
  }

  console.log("\n=== Links da demonstração ===");
  for (const link of links) console.log(link);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
