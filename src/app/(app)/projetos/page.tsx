import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { ProjectsView } from "@/components/projects/ProjectsView";

export default async function ProjetosPage() {
  await requireModulePage("projetos");

  const [projects, clients, services, squads] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, service: true, squad: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
    prisma.squad.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serialized = projects.map((p) => ({
    ...p,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    client: { id: p.client.id, name: p.client.name },
    service: p.service ? { id: p.service.id, name: p.service.name } : null,
    squad: p.squad ? { id: p.squad.id, name: p.squad.name } : null,
  }));

  return (
    <ProjectsView
      initialProjects={serialized}
      clients={clients.map((c) => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }))}
      services={services.map((s) => ({ id: s.id, name: s.name, defaultPrice: s.defaultPrice }))}
      squads={squads.map((s) => ({ id: s.id, name: s.name }))}
    />
  );
}
