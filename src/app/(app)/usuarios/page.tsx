import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { UsersView } from "@/components/users/UsersView";

export default async function UsuariosPage() {
  const session = await requireModulePage("usuarios");

  const [users, clients] = await Promise.all([
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        setor: true,
        cargo: true,
        active: true,
        moduleAccess: true,
        clientAccess: true,
        avatarUrl: true,
        passwordResetRequestedAt: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    passwordResetRequestedAt: u.passwordResetRequestedAt ? u.passwordResetRequestedAt.toISOString() : null,
    lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
  }));

  return (
    <UsersView
      initialUsers={serialized}
      currentUserId={session.user.id}
      canManage={session.user.role === "ADMIN"}
      clients={clients}
    />
  );
}
