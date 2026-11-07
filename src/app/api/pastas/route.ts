import { prisma } from "@/lib/prisma";
import { requireModule, requireSession } from "@/lib/authz";
import { hasModule } from "@/lib/modules";
import { folderSchema } from "@/lib/schemas";

const KIND_MODULE = { NOTE: "notas", CHECKLIST: "checklist" } as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as "NOTE" | "CHECKLIST" | null;

  if (kind && kind in KIND_MODULE) {
    const { error } = await requireModule(KIND_MODULE[kind]);
    if (error) return error;
  } else {
    // Sem "kind": lista pastas de nota e de checklist juntas - libera pra
    // quem tem acesso a pelo menos um dos dois módulos.
    const { session, error } = await requireSession();
    if (error) return error;
    if (session!.user.role !== "ADMIN") {
      const user = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { moduleAccess: true } });
      const allowed =
        hasModule(session!.user.role, user?.moduleAccess, "notas") ||
        hasModule(session!.user.role, user?.moduleAccess, "checklist");
      if (!allowed) return Response.json({ error: "Acesso restrito a este módulo" }, { status: 403 });
    }
  }

  const folders = await prisma.folder.findMany({
    where: kind ? { kind } : undefined,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(folders);
}

export async function POST(request: Request) {
  const { error: sessionError } = await requireSession();
  if (sessionError) return sessionError;

  const body = await request.json();
  const parsed = folderSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { error } = await requireModule(KIND_MODULE[parsed.data.kind]);
  if (error) return error;

  const maxPosition = await prisma.folder.aggregate({
    _max: { position: true },
    where: { kind: parsed.data.kind },
  });

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      position: (maxPosition._max.position ?? -1) + 1,
    },
  });

  return Response.json(folder, { status: 201 });
}
