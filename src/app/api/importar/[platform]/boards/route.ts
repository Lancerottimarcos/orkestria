import { requireAdmin } from "@/lib/authz";
import { importBoardsRequestSchema } from "@/lib/schemas";
import { getImporter, parsePlatformSlug, ImportSourceError } from "@/lib/importers";

type Params = { params: Promise<{ platform: string }> };

/** Lista os boards/projetos/databases disponíveis pro token informado - não persiste o token, só usa em memória pra essa chamada. */
export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { platform: slug } = await params;
  const platform = parsePlatformSlug(slug);
  if (!platform) return Response.json({ error: "Plataforma não suportada" }, { status: 404 });

  const body = await request.json();
  const parsed = importBoardsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const boards = await getImporter(platform).listBoards(parsed.data.token);
    return Response.json(boards);
  } catch (err) {
    const message = err instanceof ImportSourceError ? err.message : "Não foi possível buscar os quadros - confira o token";
    return Response.json({ error: message }, { status: 400 });
  }
}
