import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { saveUploadedFile, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@/lib/fileStorage";

type Params = { params: Promise<{ templateId: string }> };
type Slot = "header" | "footer";
const SLOT_FIELDS: Record<Slot, "headerUrl" | "footerUrl"> = {
  header: "headerUrl",
  footer: "footerUrl",
};

function parseSlot(value: FormDataEntryValue | null): Slot | null {
  return value === "header" || value === "footer" ? value : null;
}

export async function POST(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const form = await request.formData().catch(() => null);
  const slot = parseSlot(form?.get("slot") ?? null);
  const file = form?.get("file");
  if (!slot) return Response.json({ error: "Slot inválido" }, { status: 400 });
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  const meta = ALLOWED_UPLOAD_TYPES[file.type];
  if (!meta || meta.type !== "IMAGE") {
    return Response.json({ error: "A imagem precisa ser JPG, PNG ou WEBP" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json({ error: "Arquivo maior que 25MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUploadedFile(buffer, meta.ext);

  const template = await prisma.proposalTemplate.update({
    where: { id: templateId },
    data: { [SLOT_FIELDS[slot]]: url },
  });
  return Response.json(template);
}

export async function DELETE(request: Request, { params }: Params) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { templateId } = await params;
  const url = new URL(request.url);
  const slot = parseSlot(url.searchParams.get("slot"));
  if (!slot) return Response.json({ error: "Slot inválido" }, { status: 400 });

  const template = await prisma.proposalTemplate.update({
    where: { id: templateId },
    data: { [SLOT_FIELDS[slot]]: null },
  });
  return Response.json(template);
}
