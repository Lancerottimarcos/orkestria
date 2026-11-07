import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { postSchema } from "@/lib/schemas";

export async function GET() {
  const { error } = await requireModule("aprovacoes");
  if (error) return error;

  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      demandType: true,
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { position: "asc" } },
    },
  });
  return Response.json(posts);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("aprovacoes");
  if (error) return error;

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const post = await prisma.post.create({
    data: {
      title: data.title,
      caption: data.caption || null,
      clientId: data.clientId,
      projectId: data.projectId || null,
      demandTypeId: data.demandTypeId || null,
      priority: data.priority || "MEDIUM",
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
      createdById: session!.user.id,
      attachments: {
        create: data.attachments.map((a, i) => ({
          url: a.url,
          type: a.type,
          name: a.name || null,
          position: i,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      demandType: true,
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { position: "asc" } },
    },
  });

  return Response.json(post, { status: 201 });
}
