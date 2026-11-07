import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModulePage } from "@/lib/authz";
import { listChannelsWithMeta } from "@/lib/chat";
import { ChatView } from "@/components/chat/ChatView";

export default async function ChatPage() {
  const session = await requireModulePage("chat");

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { id: true, role: true, setor: true },
  });
  if (!user) redirect("/login");

  const [channels, mentionableUsers] = await Promise.all([
    listChannelsWithMeta(user),
    prisma.user.findMany({
      where: { active: true, id: { not: user.id } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, setor: true },
    }),
  ]);

  return (
    <ChatView
      initialChannels={channels}
      mentionableUsers={mentionableUsers}
      currentUserId={session!.user.id}
    />
  );
}
