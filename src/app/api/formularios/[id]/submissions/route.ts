import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const { id } = await params;
  const submissions = await prisma.customFormSubmission.findMany({
    where: { formId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      respondentName: true,
      respondentEmail: true,
      createdAt: true,
      responses: {
        select: {
          value: true,
          field: { select: { id: true, label: true, type: true } },
        },
      },
    },
  });

  return Response.json(submissions);
}
