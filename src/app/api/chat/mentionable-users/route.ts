import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, setor: true },
  });

  return Response.json(users);
}
