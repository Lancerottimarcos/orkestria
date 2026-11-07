import { prisma } from "@/lib/prisma";
import { requireAdmin, requireModule } from "@/lib/authz";
import { proposalTemplateSchema } from "@/lib/schemas";

// Leitura só: usada pelo seletor de modelo no modal de "Nova proposta", que
// qualquer usuário com o módulo "propostas" (padrão pra MEMBER) pode abrir -
// diferente de criar/editar/apagar modelo, que continua admin-only.
export async function GET() {
  const { error } = await requireModule("propostas");
  if (error) return error;

  const templates = await prisma.proposalTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return Response.json(templates);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = proposalTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.proposalTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const template = await prisma.proposalTemplate.create({
    data: { name: parsed.data.name, bodyJson: parsed.data.bodyJson, isDefault: parsed.data.isDefault ?? false },
  });
  return Response.json(template);
}
