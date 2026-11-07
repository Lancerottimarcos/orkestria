import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const KEEP_EMAIL = "felipe@portalpublicitario.com.br";

async function main() {
  console.log("Zerando toda a base de dados...");
  await prisma.columnAutomation.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.kanbanCard.deleteMany();
  await prisma.kanbanColumn.deleteMany();
  await prisma.kanbanBoard.deleteMany();
  await prisma.post.deleteMany();
  await prisma.note.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.project.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.service.deleteMany();
  await prisma.client.deleteMany();
  await prisma.demandType.deleteMany();

  await prisma.user.deleteMany({ where: { email: { not: KEEP_EMAIL } } });

  const keptUser = await prisma.user.findUnique({ where: { email: KEEP_EMAIL } });
  if (!keptUser) {
    throw new Error(`Usuário ${KEEP_EMAIL} não encontrado - nada foi preservado. Abortando sem criar quadro padrão.`);
  }
  if (keptUser.role !== "ADMIN") {
    await prisma.user.update({ where: { id: keptUser.id }, data: { role: "ADMIN" } });
  }

  const board = await prisma.kanbanBoard.create({ data: { name: "Quadro Principal", position: 0 } });
  await prisma.kanbanColumn.createMany({
    data: [
      { name: "Ideias", position: 0, boardId: board.id },
      { name: "Em Produção", position: 1, boardId: board.id },
      { name: "Aprovação", position: 2, boardId: board.id },
      { name: "Agendado", position: 3, boardId: board.id },
      { name: "Concluído", position: 4, boardId: board.id },
    ],
  });

  console.log(`Base zerada. Login preservado: ${keptUser.email} (${keptUser.name}), role ADMIN.`);
  console.log('Quadro "Quadro Principal" criado com 5 colunas padrão.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
