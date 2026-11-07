import { readFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

const FILENAME_RE = /^[a-f0-9-]+\.[a-z0-9]+$/i;

type Params = { params: Promise<{ filename: string }> };

/**
 * Serve os arquivos enviados via /api/uploads lendo direto do disco a cada
 * requisição. Existe porque `next start` cacheia a lista de arquivos da
 * pasta public/ no boot - um arquivo novo, enviado com o servidor já
 * rodando, fica invisível em /uploads/<arquivo> até o próximo restart. Essa
 * rota, por ser dinâmica (dentro de /api), nunca sofre desse cache.
 */
export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  if (!FILENAME_RE.test(filename)) {
    return new Response("Not found", { status: 404 });
  }
  const ext = filename.split(".").pop()!.toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, filename));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
