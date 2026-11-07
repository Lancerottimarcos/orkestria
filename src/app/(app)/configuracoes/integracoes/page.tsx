import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMetaAppStatus, getMetaRedirectUri } from "@/lib/metaConfig";
import { getTikTokAppStatus, getTikTokRedirectUri } from "@/lib/tiktokConfig";
import { getYouTubeAppStatus, getYouTubeRedirectUri } from "@/lib/youtubeConfig";
import { getLinkedInAppStatus, getLinkedInRedirectUri } from "@/lib/linkedinConfig";
import { getThreadsAppStatus, getThreadsRedirectUri } from "@/lib/threadsConfig";
import { prisma } from "@/lib/prisma";
import { getAiStatus } from "@/lib/ai";
import { getEmailStatus } from "@/lib/email";
import { getPaymentStatus } from "@/lib/payment";
import { getWhatsAppStatus } from "@/lib/whatsapp";
import { Blocks } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { IconChip } from "@/components/ui/IconChip";
import { IntegracoesPanel } from "@/components/integrations/IntegracoesPanel";
import { ServicosPanel } from "@/components/integrations/ServicosPanel";

export default async function IntegracoesPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  const [metaStatus, tikTokStatus, youTubeStatus, linkedInStatus, threadsStatus, accounts, aiStatus, emailStatus, paymentStatus, whatsAppStatus] = await Promise.all([
    getMetaAppStatus(),
    getTikTokAppStatus(),
    getYouTubeAppStatus(),
    getLinkedInAppStatus(),
    getThreadsAppStatus(),
    prisma.socialAccount.findMany({
      select: {
        id: true,
        platform: true,
        name: true,
        status: true,
        lastError: true,
        tokenExpiresAt: true,
        connectedAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: [{ client: { name: "asc" } }, { platform: "asc" }],
    }),
    getAiStatus(),
    getEmailStatus(),
    getPaymentStatus(),
    getWhatsAppStatus(),
  ]);

  return (
    <div>
      <PageHeader
        title="Integrações"
        description="Controle central das conexões do Orkestrya com serviços externos."
      />
      <IntegracoesPanel
        initialMetaStatus={{ ...metaStatus, redirectUri: getMetaRedirectUri() }}
        initialTikTokStatus={{ ...tikTokStatus, redirectUri: getTikTokRedirectUri() }}
        initialYouTubeStatus={{ ...youTubeStatus, redirectUri: getYouTubeRedirectUri() }}
        initialLinkedInStatus={{ ...linkedInStatus, redirectUri: getLinkedInRedirectUri() }}
        initialThreadsStatus={{ ...threadsStatus, redirectUri: getThreadsRedirectUri() }}
        initialAccounts={accounts.map((a) => ({
          ...a,
          tokenExpiresAt: a.tokenExpiresAt ? a.tokenExpiresAt.toISOString() : null,
          connectedAt: a.connectedAt.toISOString(),
        }))}
      />

      <div className="flex items-center gap-3 mt-10 mb-4">
        <IconChip size="sm">
          <Blocks size={14} strokeWidth={2} />
        </IconChip>
        <h2 className="text-base font-semibold text-ink">Serviços</h2>
      </div>
      <ServicosPanel
        initialAiStatus={{ ...aiStatus, updatedAt: aiStatus.updatedAt ? aiStatus.updatedAt.toISOString() : null }}
        initialEmailStatus={{ ...emailStatus, updatedAt: emailStatus.updatedAt ? emailStatus.updatedAt.toISOString() : null }}
        initialPaymentStatus={{ ...paymentStatus, updatedAt: paymentStatus.updatedAt ? paymentStatus.updatedAt.toISOString() : null }}
        initialWhatsAppStatus={{ ...whatsAppStatus, updatedAt: whatsAppStatus.updatedAt ? whatsAppStatus.updatedAt.toISOString() : null }}
      />
    </div>
  );
}
