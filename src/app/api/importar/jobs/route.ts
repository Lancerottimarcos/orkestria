import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const jobs = await prisma.importJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      targetBoard: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return Response.json(
    jobs.map((j) => ({
      id: j.id,
      platform: j.platform,
      status: j.status,
      sourceBoardName: j.sourceBoardName,
      totalCards: j.totalCards,
      importedCards: j.importedCards,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt ? j.completedAt.toISOString() : null,
      targetBoard: j.targetBoard,
      client: j.client,
      createdBy: j.createdBy,
    })),
  );
}
