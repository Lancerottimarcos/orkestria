import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveAllowedModules } from "@/lib/modules";
import { ensureUrgentAlerts, runTimeBasedAutomations } from "@/lib/automations";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.userType === "client") {
    redirect("/portal");
  }

  // Gatilhos por tempo do Kanban (prazo esgotando + power-ups CARD_IDLE/
  // DUE_DATE_APPROACHING) - rodam aqui (toda página de staff), não só em
  // /kanban, senão nunca disparavam pra quem só navega pela Home ou por
  // Agendamentos. As duas funções têm throttle interno (src/lib/automations.ts),
  // então não pesam no banco a cada navegação.
  ensureUrgentAlerts().catch((err) => console.error("[automations] ensureUrgentAlerts falhou:", err));
  runTimeBasedAutomations().catch((err) => console.error("[automations] runTimeBasedAutomations falhou:", err));

  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";
  const sidebarStyle = cookieStore.get("sidebar-style")?.value === "full" ? "full" : "compact";

  let moduleAccess: string | null = null;
  if (session.user.role !== "ADMIN") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { moduleAccess: true },
    });
    moduleAccess = user?.moduleAccess ?? null;
  }
  const allowedModules = resolveAllowedModules(session.user.role, moduleAccess);

  const pendingContractsCount = await prisma.contractedService.count({
    where: { signedAt: { not: null }, agencySignedAt: null },
  });

  // primaryColor só é salvo depois de validado como hex estrito (#rrggbb) no
  // schema - seguro interpolar direto no <style>, não vem de input livre.
  const companySettings = await prisma.companySettings.findFirst({ select: { primaryColor: true } });

  return (
    <AuthProvider>
      {companySettings?.primaryColor && (
        <style>{`:root{--color-accent:${companySettings.primaryColor};--color-accent-light:color-mix(in srgb, ${companySettings.primaryColor} 75%, white);--color-accent-dim:color-mix(in srgb, ${companySettings.primaryColor} 35%, black);}`}</style>
      )}
      <ConfirmDialogProvider>
        <AppShell
          userId={session.user.id}
          userName={session.user.name ?? "Usuário"}
          role={session.user.role}
          allowedModules={allowedModules}
          initialTheme={theme}
          initialSidebarStyle={sidebarStyle}
          pendingContractsCount={pendingContractsCount}
        >
          {children}
        </AppShell>
      </ConfirmDialogProvider>
    </AuthProvider>
  );
}
