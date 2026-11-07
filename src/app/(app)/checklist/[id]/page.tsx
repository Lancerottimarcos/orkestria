import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChecklistEditorPage } from "@/components/checklist/ChecklistEditorPage";

export default async function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [checklist, folders, clients, projects] = await Promise.all([
    prisma.checklist.findUnique({
      where: { id },
      include: { folder: true, client: true, project: true, items: { orderBy: { position: "asc" } } },
    }),
    prisma.folder.findMany({ where: { kind: "CHECKLIST" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!checklist) notFound();

  return (
    <ChecklistEditorPage
      checklist={{
        id: checklist.id,
        title: checklist.title,
        folder: checklist.folder ? { id: checklist.folder.id, name: checklist.folder.name } : null,
        client: checklist.client ? { id: checklist.client.id, name: checklist.client.name } : null,
        project: checklist.project ? { id: checklist.project.id, name: checklist.project.name } : null,
        items: checklist.items.map((i) => ({ id: i.id, text: i.text, done: i.done })),
      }}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
