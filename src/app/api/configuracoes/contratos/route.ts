import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { contractTemplateSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const templates = await prisma.contractTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return Response.json(templates);
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = contractTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.isDefault) {
    await prisma.contractTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const template = await prisma.contractTemplate.create({
    data: { name: parsed.data.name, bodyJson: parsed.data.bodyJson, isDefault: parsed.data.isDefault ?? false },
  });
  return Response.json(template);
}
