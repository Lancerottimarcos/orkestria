import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { NotesShell } from "@/components/notes/NotesShell";

export default async function NotasLayout({ children }: { children: React.ReactNode }) {
  await requireModulePage("notas");

  const [notes, folders, clients, projects] = await Promise.all([
    prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: { folder: true, client: true, project: true },
    }),
    prisma.folder.findMany({ where: { kind: "NOTE" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serialized = notes.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    updatedAt: n.updatedAt.toISOString(),
    folder: n.folder ? { id: n.folder.id, name: n.folder.name } : null,
    client: n.client ? { id: n.client.id, name: n.client.name } : null,
    project: n.project ? { id: n.project.id, name: n.project.name } : null,
  }));

  return (
    <NotesShell
      initialNotes={serialized}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    >
      {children}
    </NotesShell>
  );
}
