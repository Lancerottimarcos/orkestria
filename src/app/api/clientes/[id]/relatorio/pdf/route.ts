import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { getClientMetrics } from "@/lib/socialMetrics";
import { renderClientReportPdf } from "@/lib/renderClientReportPdf";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [client, metrics, deliveredCards, postStats] = await Promise.all([
    prisma.client.findUnique({ where: { id }, select: { name: true } }),
    getClientMetrics(prisma, id),
    prisma.kanbanCard.count({ where: { clientId: id, completedAt: { gte: thirtyDaysAgo } } }),
    prisma.post.groupBy({ by: ["status"], where: { clientId: id, createdAt: { gte: thirtyDaysAgo } }, _count: { status: true } }),
  ]);
  if (!client) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

  const approvedPosts = postStats.find((s) => s.status === "APPROVED")?._count.status ?? 0;
  const pendingPosts = postStats.find((s) => s.status === "PENDING")?._count.status ?? 0;
  const rejectedOrChangesPosts =
    (postStats.find((s) => s.status === "REJECTED")?._count.status ?? 0) +
    (postStats.find((s) => s.status === "CHANGES_REQUESTED")?._count.status ?? 0);

  const buffer = await renderClientReportPdf(
    { clientName: client.name, deliveredCards, approvedPosts, pendingPosts, rejectedOrChangesPosts },
    metrics,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=relatorio-${client.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
    },
  });
}
