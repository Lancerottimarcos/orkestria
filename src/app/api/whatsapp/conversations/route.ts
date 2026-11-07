import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";

export async function GET() {
  const { error } = await requireModule("whatsapp");
  if (error) return error;

  const conversations = await prisma.whatsAppConversation.findMany({
    orderBy: { lastMessageAt: "desc" },
    include: {
      client: { select: { id: true, name: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return Response.json(
    conversations.map((c) => ({
      id: c.id,
      phoneNumber: c.phoneNumber,
      contactName: c.contactName,
      lastMessageAt: c.lastMessageAt.toISOString(),
      client: c.client,
      lastMessage: c.messages[0]?.text ?? null,
    })),
  );
}
