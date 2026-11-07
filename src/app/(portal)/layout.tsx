import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortalShell } from "@/components/portal/PortalShell";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const dynamic = "force-dynamic";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.userType !== "client") {
    redirect("/portal/login");
  }

  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  const client = session.user.clientId
    ? await prisma.client.findUnique({ where: { id: session.user.clientId }, select: { avatarUrl: true } })
    : null;

  return (
    <AuthProvider>
      <PortalShell
        clientName={session.user.name ?? "Cliente"}
        clientAvatarUrl={client?.avatarUrl ?? null}
        initialTheme={theme}
        isClientOwner={session.user.isClientOwner ?? true}
      >
        {children}
      </PortalShell>
    </AuthProvider>
  );
}
