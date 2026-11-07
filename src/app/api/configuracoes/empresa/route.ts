import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { companySettingsSchema } from "@/lib/schemas";

async function getOrCreateSettings() {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: {} });
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await getOrCreateSettings();
  return Response.json(settings);
}

export async function PATCH(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = companySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const existing = await getOrCreateSettings();
  const settings = await prisma.companySettings.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      document: data.document || null,
      pixKey: data.pixKey || null,
      logoUrl: data.logoUrl || null,
      primaryColor: data.primaryColor || null,
    },
  });

  return Response.json(settings);
}
