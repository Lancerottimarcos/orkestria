import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { WhatsAppInboxView } from "@/components/whatsapp/WhatsAppInboxView";

export default async function WhatsAppPage() {
  await requireModulePage("whatsapp");

  const [conversations, clients] = await Promise.all([
    prisma.whatsAppConversation.findMany({
      orderBy: { lastMessageAt: "desc" },
      include: {
        client: { select: { id: true, name: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <WhatsAppInboxView
      initialConversations={conversations.map((c) => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        contactName: c.contactName,
        lastMessageAt: c.lastMessageAt.toISOString(),
        client: c.client,
        lastMessage: c.messages[0]?.text ?? null,
      }))}
      clients={clients}
    />
  );
}
