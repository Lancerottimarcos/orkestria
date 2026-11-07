import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { NoteEditorPage } from "@/components/notes/NoteEditorPage";

export default async function NotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [note, folders, clients, projects] = await Promise.all([
    prisma.note.findUnique({
      where: { id },
      include: { folder: true, client: true, project: true },
    }),
    prisma.folder.findMany({ where: { kind: "NOTE" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!note) notFound();

  return (
    <NoteEditorPage
      note={{
        id: note.id,
        title: note.title,
        content: note.content,
        folder: note.folder ? { id: note.folder.id, name: note.folder.name } : null,
        client: note.client ? { id: note.client.id, name: note.client.name } : null,
        project: note.project ? { id: note.project.id, name: note.project.name } : null,
      }}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    />
  );
}
