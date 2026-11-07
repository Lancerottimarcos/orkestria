import { prisma } from "@/lib/prisma";
import { requireClientAccess } from "@/lib/authz";
import { saveUploadedFile, normalizeFileName } from "@/lib/fileStorage";
import { renderContractPdf } from "@/lib/contracts/renderContractPdf";
import { getOrCreateCompanySettings } from "@/lib/company";

type Params = { params: Promise<{ id: string; serviceId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, serviceId } = await params;
  const { error } = await requireClientAccess("clientes", id);
  if (error) return error;

  const body = await request.json().catch(() => null);
  const templateId = body?.templateId;
  if (!templateId || typeof templateId !== "string") {
    return Response.json({ error: "Selecione um modelo de contrato" }, { status: 400 });
  }

  const [client, service, template, company] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.contractedService.findUnique({ where: { id: serviceId } }),
    prisma.contractTemplate.findUnique({ where: { id: templateId } }),
    getOrCreateCompanySettings(),
  ]);

  if (!client || !service || service.clientId !== id) {
    return Response.json({ error: "Cliente ou serviço não encontrado" }, { status: 404 });
  }
  if (!template) {
    return Response.json({ error: "Modelo de contrato não encontrado" }, { status: 404 });
  }

  const buffer = await renderContractPdf(template, {
    client: {
      name: client.name,
      contactName: client.contactName,
      document: client.document,
      address: client.address,
      email: client.email,
      phone: client.phone,
    },
    company: {
      name: company.name,
      document: company.document,
      address: company.address,
      email: company.email,
      phone: company.phone,
      pixKey: company.pixKey,
    },
    service: {
      name: service.name,
      scope: service.scope,
      value: service.value,
      period: service.period,
      startDate: service.startDate,
      renewalDate: service.renewalDate,
    },
  });

  const { url } = await saveUploadedFile(buffer, "pdf");
  const fileName = `${normalizeFileName(template.name, "contrato")}.pdf`;

  const updated = await prisma.contractedService.update({
    where: { id: serviceId },
    data: { contractUrl: url, contractName: fileName },
  });

  return Response.json(updated);
}
