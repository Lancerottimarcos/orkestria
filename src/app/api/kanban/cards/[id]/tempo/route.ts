import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { timeEntrySchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

const ENTRY_SELECT = {
  id: true,
  minutes: true,
  date: true,
  note: true,
  billable: true,
  createdAt: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
};

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const entries = await prisma.timeEntry.findMany({
    where: { cardId: id },
    orderBy: { date: "desc" },
    select: ENTRY_SELECT,
  });
  return Response.json(entries);
}

export async function POST(request: Request, { params }: Params) {
  const { session, error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = timeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      cardId: id,
      userId: session!.user.id,
      minutes: parsed.data.minutes,
      date: new Date(parsed.data.date),
      note: parsed.data.note || null,
      billable: parsed.data.billable ?? true,
    },
    select: ENTRY_SELECT,
  });
  return Response.json(entry, { status: 201 });
}
