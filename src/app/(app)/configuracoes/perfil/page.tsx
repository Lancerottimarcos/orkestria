import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConfiguracoesView } from "@/components/configuracoes/ConfiguracoesView";

export default async function ConfiguracoesPerfilPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const currentUser = session?.user.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } })
    : null;

  let company = null;
  if (isAdmin) {
    company = await prisma.companySettings.findFirst();
    if (!company) {
      company = await prisma.companySettings.create({ data: {} });
    }
  }

  return (
    <ConfiguracoesView
      user={{
        name: session?.user.name ?? "",
        email: session?.user.email ?? "",
        avatarUrl: currentUser?.avatarUrl ?? null,
      }}
      isAdmin={isAdmin}
      company={
        company
          ? {
              name: company.name,
              email: company.email ?? "",
              phone: company.phone ?? "",
              address: company.address ?? "",
              document: company.document ?? "",
              pixKey: company.pixKey ?? "",
            }
          : null
      }
    />
  );
}
