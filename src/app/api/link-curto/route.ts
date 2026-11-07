import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireModule } from "@/lib/authz";
import { shortLinkSchema } from "@/lib/schemas";
import { ensureUniqueSlug } from "@/lib/slug";

export async function GET() {
  const { error } = await requireModule("ferramentas");
  if (error) return error;

  const links = await prisma.shortLink.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, targetUrl: true, clicks: true, createdAt: true },
  });

  return Response.json(links);
}

export async function POST(request: Request) {
  const { session, error } = await requireModule("ferramentas");
  if (error) return error;

  const body = await request.json();
  const parsed = shortLinkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const isTaken = async (slug: string) => (await prisma.shortLink.count({ where: { slug } })) > 0;
  const base = data.slug?.trim() || Math.random().toString(36).slice(2, 8);

  // A checagem de disponibilidade acima e o create abaixo não são atômicos -
  // duas requisições concorrentes podem passar pela mesma checagem antes de
  // qualquer uma criar. Em vez de deixar o erro de unicidade do banco virar
  // um 500 cru, tenta de novo com um novo slug até resolver.
  let link = null;
  for (let attempt = 0; attempt < 5 && !link; attempt++) {
    const slug = await ensureUniqueSlug(base, isTaken);
    try {
      link = await prisma.shortLink.create({
        data: {
          slug,
          targetUrl: data.targetUrl,
          createdById: session!.user.id,
        },
        select: { id: true, slug: true, targetUrl: true, clicks: true, createdAt: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }

  if (!link) {
    return Response.json({ error: "Não foi possível gerar um link único agora, tente novamente" }, { status: 409 });
  }

  return Response.json(link, { status: 201 });
}
