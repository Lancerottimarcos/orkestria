import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { checklistItemSchema } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = checklistItemSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const maxPosition = await prisma.checklistItem.aggregate({
    _max: { position: true },
    where: { checklistId: id },
  });

  const item = await prisma.checklistItem.create({
    data: {
      text: parsed.data.text,
      checklistId: id,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  await prisma.checklist.update({ where: { id }, data: { updatedAt: new Date() } });

  return Response.json(item, { status: 201 });
}
