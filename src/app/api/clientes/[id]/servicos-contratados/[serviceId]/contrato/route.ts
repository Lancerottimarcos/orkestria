import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { saveUploadedFile, MAX_UPLOAD_SIZE_BYTES } from "@/lib/fileStorage";

type Params = { params: Promise<{ id: string; serviceId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, serviceId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return Response.json({ error: "O contrato precisa ser um PDF" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return Response.json({ error: "Arquivo maior que 25MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { url } = await saveUploadedFile(buffer, "pdf");

  const service = await prisma.contractedService.update({
    where: { id: serviceId },
    data: { contractUrl: url, contractName: file.name },
  });

  return Response.json(service);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id, serviceId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const service = await prisma.contractedService.update({
    where: { id: serviceId },
    data: { contractUrl: null, contractName: null },
  });
  return Response.json(service);
}
