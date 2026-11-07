import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { buildProposalTemplate, PROPOSAL_TEMPLATE_KINDS } from "../src/lib/proposals/proposalTemplateFactory";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Popula/atualiza os cinco modelos prontos de proposta comercial usando a
// mesma fábrica do botão "Gerar modelo pronto"
// (src/lib/proposals/proposalTemplateFactory.ts). Upsert por nome - rodar de
// novo atualiza em vez de duplicar. "Redes Sociais" marcado como padrão.
async function main() {
  for (const { kind, name } of PROPOSAL_TEMPLATE_KINDS) {
    const template = buildProposalTemplate(kind);
    const isDefault = kind === "redes-sociais";
    const existing = await prisma.proposalTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      await prisma.proposalTemplate.update({ where: { id: existing.id }, data: { bodyJson: template.bodyJson, isDefault } });
      console.log(`Atualizado: ${template.name}`);
    } else {
      await prisma.proposalTemplate.create({ data: { ...template, isDefault } });
      console.log(`Criado: ${name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
