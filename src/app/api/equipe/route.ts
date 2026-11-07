import { prisma } from "@/lib/prisma";
import { requireModule, requireAdmin } from "@/lib/authz";
import { hasModule } from "@/lib/modules";
import { teamMemberSchema } from "@/lib/schemas";

export async function GET() {
  const { session, error } = await requireModule("equipe");
  if (error) return error;

  // "equipe" é módulo padrão pra qualquer MEMBER, mas o salário (monthlyValue)
  // é dado de financeiro - só sai pra quem tem financeiro liberado (ou admin),
  // mesmo que a pessoa tenha acesso à listagem de equipe em si.
  const canSeeCompensation = await canSeeTeamCompensation(session!.user.id, session!.user.role);

  const members = await prisma.teamMember.findMany({
    orderBy: { name: "asc" },
    omit: canSeeCompensation ? {} : { monthlyValue: true, paymentType: true },
    include: { _count: { select: { squadMemberships: true, leadOfSquads: true } } },
  });
  return Response.json(members);
}

export async function canSeeTeamCompensation(userId: string, role: "ADMIN" | "MEMBER") {
  if (role === "ADMIN") return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { moduleAccess: true } });
  return hasModule(role, user?.moduleAccess, "financeiro");
}

export async function POST(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const parsed = teamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  if (data.email) {
    const existing = await prisma.teamMember.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existing) {
      return Response.json(
        { error: { formErrors: [], fieldErrors: { email: ["Já existe alguém da equipe com este e-mail"] } } },
        { status: 400 },
      );
    }
  }

  const member = await prisma.teamMember.create({
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

  return Response.json(member, { status: 201 });
}
