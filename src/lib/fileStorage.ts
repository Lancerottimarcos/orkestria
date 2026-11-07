import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export type StoredAttachmentType = "IMAGE" | "VIDEO" | "FILE";

/**
 * MIME types aceitos para upload (manual ou via importação) e o tipo de
 * Attachment/extensão correspondentes. FILE é o tipo genérico (PDF, Word,
 * planilha) - sem preview, só ícone + nome + link de download.
 */
export const ALLOWED_UPLOAD_TYPES: Record<string, { ext: string; type: StoredAttachmentType }> = {
  "image/jpeg": { ext: "jpg", type: "IMAGE" },
  "image/png": { ext: "png", type: "IMAGE" },
  "image/webp": { ext: "webp", type: "IMAGE" },
  "image/gif": { ext: "gif", type: "IMAGE" },
  "image/svg+xml": { ext: "svg", type: "IMAGE" },
  "video/mp4": { ext: "mp4", type: "VIDEO" },
  "video/quicktime": { ext: "mov", type: "VIDEO" },
  "application/pdf": { ext: "pdf", type: "FILE" },
  "application/msword": { ext: "doc", type: "FILE" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "docx", type: "FILE" },
  "application/vnd.ms-excel": { ext: "xls", type: "FILE" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "xlsx", type: "FILE" },
  "text/csv": { ext: "csv", type: "FILE" },
};

/** Normaliza um nome pra usar como nome de arquivo exibido (remove acentos, mantém a letra base: "ã" -> "a"). */
export function normalizeFileName(name: string, fallback = "arquivo"): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim();
  return normalized || fallback;
}

/** Salva bytes já em memória em disco, servido publicamente em /api/uploads/file/<nome>. */
export async function saveUploadedFile(buffer: Buffer, ext: string): Promise<{ filename: string; url: string }> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return { filename, url: `/api/uploads/file/${filename}` };
}

/**
 * Baixa um arquivo de uma URL externa (usado pela importação de outras
 * ferramentas) e salva localmente, igual ao upload manual. Retorna null se o
 * tipo não é suportado, o download falha, ou o arquivo é grande demais -
 * quem chama decide se conta isso como "anexo ignorado" no resumo.
 */
export async function downloadAndSaveFile(
  sourceUrl: string,
  name: string,
  headers?: HeadersInit,
): Promise<{ url: string; type: StoredAttachmentType; name: string } | null> {
  try {
    const res = await fetch(sourceUrl, { headers });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const meta = ALLOWED_UPLOAD_TYPES[contentType];
    if (!meta) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_SIZE_BYTES) return null;
    const { url } = await saveUploadedFile(buffer, meta.ext);
    return { url, type: meta.type, name };
  } catch {
    return null;
  }
}
