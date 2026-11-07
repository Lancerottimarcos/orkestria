import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { clientSchema } from "@/lib/schemas";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { logActivity } from "@/lib/activityLog";
import { resolveClientAccess } from "@/lib/clientAccess";

const CLIENT_SELECT = {
  id: true,
  name: true,
  contactName: true,
  email: true,
  phone: true,
  monthlyValue: true,
  billingDay: true,
  status: true,
  startDate: true,
  notes: true,
  avatarUrl: true,
  coverUrl: true,
  coverColor: true,
  icon: true,
  portalEnabled: true,
  portalEmail: true,
  portalSlug: true,
  passwordResetRequestedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { projects: true } },
  projects: { select: { service: { select: { name: true } } } },
} as const;

export async function GET() {
  const { session, error } = await requireModule("clientes");
  if (error) return error;

  let visibleClientIds: string[] | null = null;
  if (session!.user.role !== "ADMIN") {
    const currentUser = await prisma.user.findUnique({ where: { id: session!.user.id }, select: { clientAccess: true } });
    visibleClientIds = resolveClientAccess(session!.user.role, currentUser?.clientAccess);
  }

  const [clients, postCounts] = await Promise.all([
    prisma.client.findMany({
      where: visibleClientIds ? { id: { in: visibleClientIds } } : undefined,
      orderBy: { name: "asc" },
      select: CLIENT_SELECT,
    }),
    prisma.post.groupBy({
      by: ["clientId", "status"],
      _count: { status: true },
    }),
  ]);

  const statsByClient = new Map<string, { pending: number; approved: number; changesRequested: number; rejected: number }>();
  for (const row of postCounts) {
    const entry = statsByClient.get(row.clientId) ?? { pending: 0, approved: 0, changesRequested: 0, rejected: 0 };
    if (row.status === "PENDING") entry.pending = row._count.status;
    if (row.status === "APPROVED") entry.approved = row._count.status;
    if (row.status === "CHANGES_REQUESTED") entry.changesRequested = row._count.status;
    if (row.status === "REJECTED") entry.rejected = row._count.status;
    statsByClient.set(row.clientId, entry);
  }

  const result = clients.map(({ projects, ...client }) => ({
    ...client,
    services: Array.from(new Set(projects.map((p) => p.service?.name).filter((n): n is string => !!n))),
    postStats: statsByClient.get(client.id) ?? { pending: 0, approved: 0, changesRequested: 0, rejected: 0 },
  }));

  return Response.json(result);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("clientes");
  if (error) return error;

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  let portalSlug: string | null = null;
  if (data.portalSlug) {
    const requested = slugify(data.portalSlug);
    const taken = await prisma.client.findUnique({ where: { portalSlug: requested } });
    if (taken) {
      return Response.json(
        { error: { formErrors: [], fieldErrors: { portalSlug: ["Esse link já está em uso"] } } },
        { status: 400 },
      );
    }
    portalSlug = requested;
  } else if (data.portalEnabled) {
    portalSlug = await ensureUniqueSlug(data.name, async (slug) => {
      const existing = await prisma.client.findUnique({ where: { portalSlug: slug } });
      return !!existing;
    });
  }

  const client = await prisma.client.create({
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      document: data.document || null,
      address: data.address || null,
      monthlyValue: data.monthlyValue,
      billingDay: data.billingDay,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      notes: data.notes || null,
      avatarUrl: data.avatarUrl || null,
      coverUrl: data.coverUrl || null,
      coverColor: data.coverColor || null,
      icon: data.icon || null,
      portalEnabled: data.portalEnabled ?? false,
      portalEmail: data.portalEmail || null,
      portalSlug,
    },
    select: CLIENT_SELECT,
  });

  await logActivity({
    action: "create",
    entityType: "Client",
    entityId: client.id,
    summary: `Cliente "${client.name}" cadastrado`,
    userId: session!.user.id,
  });

  const { projects, ...rest } = client;
  return Response.json(
    { ...rest, services: Array.from(new Set(projects.map((p) => p.service?.name).filter((n): n is string => !!n))) },
    { status: 201 },
  );
}
