import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { PostsView } from "@/components/posts/PostsView";

export default async function AprovacoesPage() {
  await requireModulePage("aprovacoes");

  const [posts, clients, projects, demandTypes] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        demandType: true,
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        attachments: { orderBy: { position: "asc" } },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, clientId: true } }),
    prisma.demandType.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
  ]);

  const serialized = posts.map((p) => ({
    id: p.id,
    title: p.title,
    caption: p.caption,
    status: p.status,
    priority: p.priority,
    token: p.token,
    feedback: p.feedback,
    reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
    scheduledDate: p.scheduledDate ? p.scheduledDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    client: p.client,
    project: p.project,
    demandType: p.demandType ? { id: p.demandType.id, name: p.demandType.name, color: p.demandType.color } : null,
    createdBy: p.createdBy,
    reviewedByName: p.attachments[0]?.reviewedByName ?? null,
    // Anexo de Post nunca é FILE - só imagem/vídeo entra nesse fluxo (garantido no schema de escrita).
    attachments: p.attachments.map((a) => ({ id: a.id, url: a.url, type: a.type as "IMAGE" | "VIDEO", name: a.name })),
  }));

  return (
    <PostsView
      initialPosts={serialized}
      clients={clients.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }))}
      projects={projects}
      initialDemandTypes={demandTypes.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
    />
  );
}
