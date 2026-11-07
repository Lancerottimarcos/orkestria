import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { postSchema } from "@/lib/schemas";
import { aggregatePostStatus } from "@/lib/postReview";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { error } = await requireModule("aprovacoes");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const existingAttachments = await prisma.attachment.findMany({ where: { postId: id } });
  const existingByUrl = new Map(existingAttachments.map((a) => [a.url, a]));
  const newUrls = new Set(data.attachments.map((a) => a.url));
  const toDeleteIds = existingAttachments.filter((a) => !newUrls.has(a.url)).map((a) => a.id);

  // Diff por url em vez de apagar tudo e recriar: um anexo que continua na
  // lista preserva status/feedback/reviewedAt de aprovações já feitas -
  // editar só o título de um Post não pode forçar reaprovação de anexo já
  // revisado e inalterado.
  await prisma.$transaction([
    ...(toDeleteIds.length ? [prisma.attachment.deleteMany({ where: { id: { in: toDeleteIds } } })] : []),
    ...data.attachments
      .map((a, position) => ({ a, position, existing: existingByUrl.get(a.url) }))
      .filter((x) => x.existing)
      .map(({ a, position, existing }) =>
        prisma.attachment.update({ where: { id: existing!.id }, data: { position, name: a.name || null } }),
      ),
    prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        caption: data.caption || null,
        clientId: data.clientId,
        projectId: data.projectId || null,
        demandTypeId: data.demandTypeId || null,
        priority: data.priority || "MEDIUM",
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        attachments: {
          create: data.attachments
            .map((a, position) => ({ a, position }))
            .filter(({ a }) => !existingByUrl.has(a.url))
            .map(({ a, position }) => ({ url: a.url, type: a.type, name: a.name || null, position })),
        },
      },
    }),
  ]);

  // Recalcula o status agregado do Post a partir do conjunto final de anexos
  // (mistura de anexos preservados + novos) em vez de resetar cego pra PENDING.
  const finalAttachments = await prisma.attachment.findMany({ where: { postId: id } });
  const aggregated = aggregatePostStatus(finalAttachments);

  const post = await prisma.post.update({
    where: { id },
    data: {
      status: aggregated.status,
      feedback: aggregated.feedback,
      // Volta a PENDING (ex: anexo novo entrou na revisão) - reviewedAt não
      // pode continuar apontando pra uma aprovação antiga que não reflete
      // mais o estado atual do post, senão ele conta em "Tempo médio p/
      // decisão" (src/app/(app)/desempenho/page.tsx) como já resolvido.
      ...(aggregated.status === "PENDING" ? { reviewedAt: null } : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      demandType: true,
      createdBy: { select: { id: true, name: true, avatarUrl: true } },
      attachments: { orderBy: { position: "asc" } },
    },
  });

  return Response.json(post);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { error } = await requireModule("aprovacoes");
  if (error) return error;

  const { id } = await params;
  await prisma.post.delete({ where: { id } });
  return Response.json({ ok: true });
}
