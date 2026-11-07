import { auth } from "@/auth";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES, saveUploadedFile } from "@/lib/fileStorage";

/**
 * Salva um arquivo em disco, servido publicamente em /uploads/<arquivo>.
 * Necessário porque a Content Publishing API do Instagram só aceita mídia
 * hospedada em uma URL pública HTTPS (não aceita upload direto de bytes).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json({ error: "Arquivo maior que 25MB" }, { status: 400 });
  }
  const meta = ALLOWED_UPLOAD_TYPES[file.type];
  if (!meta) {
    return Response.json({ error: "Tipo de arquivo não suportado" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUploadedFile(buffer, meta.ext);

  return Response.json({ url, type: meta.type, name: file.name });
}
