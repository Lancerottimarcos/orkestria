import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

export async function GET(request: Request) {
  const { error } = await requireModule("timesheet");
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const clientId = searchParams.get("clientId") || undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      date: {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      },
      card: clientId ? { clientId } : undefined,
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      minutes: true,
      date: true,
      note: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
      card: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  });

  return Response.json(entries);
}
