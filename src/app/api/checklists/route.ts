import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { checklistSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const checklists = await prisma.checklist.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      folder: true,
      client: true,
      project: true,
      items: { orderBy: { position: "asc" } },
    },
  });
  return Response.json(checklists);
}

export async function POST(request: Request) {
  const { error } = await requireModule("checklist");
  if (error) return error;

  const body = await request.json();
  const parsed = checklistSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const checklist = await prisma.checklist.create({
    data: {
      title: data.title,
      folderId: data.folderId || null,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      cardId: data.cardId || null,
    },
    include: { folder: true, client: true, project: true, items: true },
  });

  return Response.json(checklist, { status: 201 });
}
