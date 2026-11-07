import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { buildContractTemplate, DEFAULT_ANSWERS, TEMPLATE_KINDS } from "../src/lib/contracts/templateFactory";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Popula/atualiza os três modelos de contrato em legal design usando a mesma
// fábrica do fluxo guiado interno (src/lib/contracts/templateFactory.ts), com
// as respostas padrão. Upsert por nome - rodar de novo atualiza em vez de
// duplicar.
async function main() {
  for (const { kind } of TEMPLATE_KINDS) {
    const template = buildContractTemplate(kind, DEFAULT_ANSWERS);
    const existing = await prisma.contractTemplate.findFirst({ where: { name: template.name } });
    if (existing) {
      await prisma.contractTemplate.update({ where: { id: existing.id }, data: { bodyJson: template.bodyJson } });
      console.log(`Atualizado: ${template.name}`);
    } else {
      await prisma.contractTemplate.create({ data: template });
      console.log(`Criado: ${template.name}`);
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
