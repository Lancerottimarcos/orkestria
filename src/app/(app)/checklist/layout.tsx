import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ChecklistShell } from "@/components/checklist/ChecklistShell";

export default async function ChecklistLayout({ children }: { children: React.ReactNode }) {
  await requireModulePage("checklist");

  const [checklists, folders, clients, projects] = await Promise.all([
    prisma.checklist.findMany({
      orderBy: { updatedAt: "desc" },
      include: { folder: true, client: true, project: true, items: { orderBy: { position: "asc" } } },
    }),
    prisma.folder.findMany({ where: { kind: "CHECKLIST" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serialized = checklists.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    folder: c.folder ? { id: c.folder.id, name: c.folder.name } : null,
    client: c.client ? { id: c.client.id, name: c.client.name } : null,
    project: c.project ? { id: c.project.id, name: c.project.name } : null,
    items: c.items.map((i) => ({ id: i.id, text: i.text, done: i.done })),
  }));

  return (
    <ChecklistShell
      initialChecklists={serialized}
      initialFolders={folders.map((f) => ({ id: f.id, name: f.name }))}
      clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    >
      {children}
    </ChecklistShell>
  );
}
