import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { teamMemberSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = teamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.email) {
    const existing = await prisma.teamMember.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing && existing.id !== id) {
      return Response.json(
        { error: { formErrors: [], fieldErrors: { email: ["Já existe alguém da equipe com este e-mail"] } } },
        { status: 400 },
      );
    }
  }

  const member = await prisma.teamMember.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      paymentType: data.paymentType,
      monthlyValue: data.monthlyValue,
      active: data.active ?? true,
      avatarUrl: data.avatarUrl || null,
    },
  });

  return Response.json(member);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await prisma.teamMember.delete({ where: { id } });
  return Response.json({ ok: true });
}
