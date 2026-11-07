import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { salesGoalSchema } from "@/lib/schemas";

async function computeProgress(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const closedWon = await prisma.salesOpportunity.findMany({
    where: {
      closedAt: { gte: start, lt: end },
      stage: { isWon: true },
    },
    select: { monthlyValue: true },
  });

  return {
    closedCount: closedWon.length,
    closedMonthlyValue: closedWon.reduce((sum, o) => sum + (o.monthlyValue ?? 0), 0),
  };
}

export async function GET(request: Request) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const url = new URL(request.url);
  const now = new Date();
  const year = Number(url.searchParams.get("year")) || now.getFullYear();
  const month = Number(url.searchParams.get("month")) || now.getMonth() + 1;

  const [goal, progress] = await Promise.all([
    prisma.salesGoal.findUnique({ where: { year_month: { year, month } } }),
    computeProgress(year, month),
  ]);

  return Response.json({ year, month, target: goal?.target ?? 0, ...progress });
}

export async function PUT(request: Request) {
  const { error } = await requireModule("crm");
  if (error) return error;

  const body = await request.json();
  const parsed = salesGoalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { year, month, target } = parsed.data;

  await prisma.salesGoal.upsert({
    where: { year_month: { year, month } },
    update: { target },
    create: { year, month, target },
  });

  const progress = await computeProgress(year, month);
  return Response.json({ year, month, target, ...progress });
}
