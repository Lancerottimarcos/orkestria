import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BoardTemplateEditorScreen } from "@/components/configuracoes/BoardTemplateEditorScreen";

export default async function BoardTemplateEditorPage({ params }: { params: Promise<{ templateId: string }> }) {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const { templateId } = await params;
  const template = await prisma.boardTemplate.findUnique({
    where: { id: templateId },
    include: { columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
  });
  if (!template) notFound();

  return <BoardTemplateEditorScreen template={template} />;
}
