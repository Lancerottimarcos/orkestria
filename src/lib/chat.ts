import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export function staffChannelVisibilityWhere(user: {
  id: string;
  role: "ADMIN" | "MEMBER";
  setor: string | null;
}): Prisma.ChatChannelWhereInput {
  if (user.role === "ADMIN") return {};

  return {
    OR: [
      { kind: "CLIENT" },
      ...(user.setor ? [{ kind: "SECTOR" as const, sector: user.setor }] : []),
      { kind: "GROUP", members: { some: { userId: user.id } } },
      { kind: "DM", members: { some: { userId: user.id } } },
    ],
  };
}

export async function canStaffAccessChannel(
  channelId: string,
  user: { id: string; role: "ADMIN" | "MEMBER"; setor: string | null },
) {
  const channel = await prisma.chatChannel.findUnique({
    where: { id: channelId },
    select: { kind: true, sector: true, members: { where: { userId: user.id }, select: { id: true } } },
  });
  if (!channel) return false;
  if (user.role === "ADMIN") return true;
  if (channel.kind === "CLIENT") return true;
  if (channel.kind === "SECTOR") return !!user.setor && channel.sector === user.setor;
  if (channel.kind === "GROUP" || channel.kind === "DM") return channel.members.length > 0;
  return false;
}

export async function getOrCreateClientChannel(clientId: string, clientName: string) {
  const existing = await prisma.chatChannel.findUnique({ where: { clientId } });
  if (existing) return existing;
  return prisma.chatChannel.create({
    data: { name: clientName, kind: "CLIENT", clientId },
  });
}

export async function getOrCreateDMChannel(userId: string, otherUserId: string) {
  const existing = await prisma.chatChannel.findFirst({
    where: {
      kind: "DM",
      AND: [{ members: { some: { userId } } }, { members: { some: { userId: otherUserId } } }],
    },
  });
  if (existing) return existing;

  return prisma.chatChannel.create({
    data: {
      name: "Conversa direta",
      kind: "DM",
      members: { create: [{ userId }, { userId: otherUserId }] },
    },
  });
}

export async function listChannelsWithMeta(user: { id: string; role: "ADMIN" | "MEMBER"; setor: string | null }) {
  const channels = await prisma.chatChannel.findMany({
    where: staffChannelVisibilityWhere(user),
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      kind: true,
      sector: true,
      avatarUrl: true,
      color: true,
      clientId: true,
      client: { select: { name: true } },
      _count: { select: { members: true } },
      members: {
        select: {
          userId: true,
          pinned: true,
          lastReadAt: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          text: true,
          createdAt: true,
          authorUser: { select: { name: true } },
          authorClient: { select: { name: true } },
        },
      },
    },
  });

  const withMeta = await Promise.all(
    channels.map(async (c) => {
      const membership = c.members.find((m) => m.userId === user.id);
      const otherMember = c.kind === "DM" ? (c.members.find((m) => m.userId !== user.id)?.user ?? null) : null;
      const unreadCount = await prisma.chatMessage.count({
        where: {
          channelId: c.id,
          createdAt: { gt: membership?.lastReadAt ?? new Date(0) },
          NOT: { authorUserId: user.id },
        },
      });
      // Menção não lida é informação diferente de "tem mensagem não lida" -
      // sem isso, uma conversa onde te marcaram fica indistinguível na lista
      // de qualquer outra conversa só com barulho normal.
      const unreadMentionCount = await prisma.chatMessage.count({
        where: {
          channelId: c.id,
          createdAt: { gt: membership?.lastReadAt ?? new Date(0) },
          NOT: { authorUserId: user.id },
          mentionedUserId: user.id,
        },
      });

      return {
        id: c.id,
        name: c.kind === "DM" && otherMember ? otherMember.name : c.name,
        kind: c.kind,
        sector: c.sector,
        avatarUrl: c.kind === "DM" ? (otherMember?.avatarUrl ?? null) : c.avatarUrl,
        color: c.color,
        clientId: c.clientId,
        client: c.client,
        memberCount: c._count.members,
        pinned: membership?.pinned ?? false,
        unreadCount,
        hasUnreadMention: unreadMentionCount > 0,
        lastMessage: c.messages[0]
          ? { ...c.messages[0], createdAt: c.messages[0].createdAt.toISOString() }
          : null,
      };
    }),
  );

  withMeta.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });

  return withMeta;
}
