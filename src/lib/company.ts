import { prisma } from "@/lib/prisma";

/** Config única da empresa (linha singleton) - cria com valores padrão se ainda não existir. */
export async function getOrCreateCompanySettings() {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: {} });
}
