import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasModule, type ModuleKey } from "@/lib/modules";
import { hasClientAccess } from "@/lib/clientAccess";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: Response.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireAdmin() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (session!.user.userType !== "staff" || session!.user.role !== "ADMIN") {
    return { session: null, error: Response.json({ error: "Acesso restrito ao administrador" }, { status: 403 }) };
  }
  return { session, error: null };
}

// As três funções abaixo protegem rotas/páginas exclusivas da equipe
// (staff) - uma sessão do Portal do Cliente (userType "client") nunca tem
// `role`/`moduleAccess` reais (são conceitos de User, não de Client), então
// sem essa checagem explícita ela caía no fallback de "MEMBER legado sem
// configuração" e herdava acesso de equipe a quase todo módulo. Rotas do
// portal (src/app/api/portal/**) não usam essas funções - checam sessão de
// cliente e escopo por clientId diretamente.
export async function requireModule(key: ModuleKey) {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (session!.user.userType !== "staff") {
    return { session: null, error: Response.json({ error: "Acesso restrito a este módulo" }, { status: 403 }) };
  }
  if (session!.user.role === "ADMIN") return { session, error: null };

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { moduleAccess: true },
  });
  if (!hasModule(session!.user.role, user?.moduleAccess, key)) {
    return { session: null, error: Response.json({ error: "Acesso restrito a este módulo" }, { status: 403 }) };
  }
  return { session, error: null };
}

// Combina requireModule com o escopo de clientAccess (src/lib/clientAccess.ts) -
// use em toda rota de API sob /api/clientes/[id]/** pra que um MEMBER restrito
// a alguns clientes não consiga ler/editar dados de um cliente fora do escopo
// só sabendo o id (nunca exposto por padrão nas telas, mas alcançável, ex.
// pelo dropdown de outro módulo que não filtra por clientAccess).
export async function requireClientAccess(key: ModuleKey, clientId: string) {
  const { session, error } = await requireModule(key);
  if (error) return { session: null, error };
  if (session!.user.role === "ADMIN") return { session, error: null };

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { clientAccess: true },
  });
  if (!hasClientAccess(session!.user.role, user?.clientAccess, clientId)) {
    return { session: null, error: Response.json({ error: "Cliente não encontrado" }, { status: 404 }) };
  }
  return { session, error: null };
}

export async function requireModulePage(key: ModuleKey) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.userType !== "staff") redirect("/");
  if (session.user.role !== "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { moduleAccess: true },
    });
    if (!hasModule(session.user.role, user?.moduleAccess, key)) redirect("/");
  }
  return session;
}
