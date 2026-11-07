import { prisma } from "@/lib/prisma";
import { requireClientAccess, requireAdmin } from "@/lib/authz";
import { clientSchema } from "@/lib/schemas";
import { ensureUniqueSlug, slugify } from "@/lib/slug";
import { logActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const client = await prisma.client.findUnique({
    where: { id },
    omit: { portalPasswordHash: true },
    include: {
      projects: { orderBy: { createdAt: "desc" } },
      transactions: { orderBy: { dueDate: "desc" }, take: 20 },
    },
  });

  if (!client) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  return Response.json(client);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { session, error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json();
  const parsed = clientSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const current = await prisma.client.findUnique({ where: { id }, select: { portalSlug: true, name: true } });
  if (!current) {
    return Response.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  let portalSlug = current.portalSlug;
  if (data.portalSlug) {
    const requested = slugify(data.portalSlug);
    if (requested !== current.portalSlug) {
      const taken = await prisma.client.findUnique({ where: { portalSlug: requested } });
      if (taken && taken.id !== id) {
        return Response.json(
          { error: { formErrors: [], fieldErrors: { portalSlug: ["Esse link já está em uso"] } } },
          { status: 400 },
        );
      }
      portalSlug = requested;
    }
  } else if (data.portalEnabled && !portalSlug) {
    portalSlug = await ensureUniqueSlug(data.name, async (slug) => {
      const existing = await prisma.client.findUnique({ where: { portalSlug: slug } });
      return !!existing && existing.id !== id;
    });
  }

  const client = await prisma.client.update({
    where: { id },
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
    omit: { portalPasswordHash: true },
  });

  await logActivity({
    action: "update",
    entityType: "Client",
    entityId: client.id,
    summary: `Cliente "${client.name}" editado`,
    userId: session!.user.id,
  });

  return Response.json(client);
}

// Admin-only de propósito: a cascata dessa exclusão atinge módulos que
// quem só tem "clientes" liberado pode nunca ter tido acesso pra ver -
// cofre de senhas, contas sociais com token, contratos já assinados,
// quadro Kanban inteiro do cliente e todo o histórico de chat.
export async function DELETE(_request: Request, { params }: Params) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true } });
  await prisma.client.delete({ where: { id } });

  await logActivity({
    action: "delete",
    entityType: "Client",
    entityId: id,
    summary: `Cliente "${client?.name ?? id}" excluído`,
    userId: session!.user.id,
  });

  return Response.json({ ok: true });
}
