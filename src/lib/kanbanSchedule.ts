import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { scheduleFacebookPost, deleteFacebookPost } from "@/lib/meta";
import { uploadYouTubeVideo, deleteYouTubeVideo } from "@/lib/youtube";

export const VALID_NETWORKS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "YOUTUBE", "LINKEDIN", "THREADS"] as const;
export type ScheduleNetwork = (typeof VALID_NETWORKS)[number];

export const CARD_INCLUDE = {
  client: true,
  project: true,
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  post: { select: { id: true, title: true, status: true, token: true, feedback: true } },
  demandType: true,
  attachments: { orderBy: { position: "asc" as const } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: { id: true, name: true } },
      mentionedUser: { select: { id: true, name: true } },
    },
  },
  checklists: { include: { items: true } },
};

export function serializeCard<T extends { checklists: { id: string; title: string; items: { done: boolean }[] }[] }>(
  card: T,
) {
  return {
    ...card,
    checklists: card.checklists.map((cl) => ({
      id: cl.id,
      title: cl.title,
      total: cl.items.length,
      done: cl.items.filter((i) => i.done).length,
    })),
  };
}

export function absoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}${url}`;
}

/**
 * Define ou limpa o agendamento de publicação de uma demanda que já existe.
 * Usado tanto pela rota de agendar uma demanda já criada quanto pela de
 * criar + agendar de uma vez (agendamento direto na aba Agendamentos).
 */
export async function applyCardSchedule(
  cardId: string,
  network: ScheduleNetwork | null,
  scheduledAt: Date | null,
): Promise<{ card: ReturnType<typeof serializeCard>; status: number } | null> {
  const card = await prisma.kanbanCard.findUnique({
    where: { id: cardId },
    include: { attachments: { orderBy: { position: "asc" } } },
  });
  if (!card) return null;

  async function finishUpdate(data: Record<string, unknown>, status = 200) {
    const updated = await prisma.kanbanCard.update({ where: { id: cardId }, data, include: CARD_INCLUDE });
    return { card: serializeCard(updated), status };
  }

  if (!network || !scheduledAt) {
    // Se cancelar localmente mas a exclusão do lado da rede falhar (token
    // expirado etc.), o post/vídeo pode publicar sozinho no horário original
    // mesmo aparecendo "cancelado" aqui - sinaliza isso pro usuário via 207
    // em vez de engolir silenciosamente, mas sem travar o cancelamento local.
    let externalDeleteFailed = false;

    // Se era um agendamento nativo do Facebook ainda não publicado, cancela
    // lá também - senão o post continua "vivo" do lado do Facebook mesmo
    // depois de removido daqui.
    if (card.scheduledNetwork === "FACEBOOK" && card.externalPostId && card.publishStatus !== "PUBLISHED") {
      const facebookAccount = card.clientId
        ? await prisma.socialAccount.findUnique({
            where: { clientId_platform: { clientId: card.clientId, platform: "FACEBOOK" } },
          })
        : null;
      if (facebookAccount) {
        try {
          await deleteFacebookPost(card.externalPostId, decryptSecret(facebookAccount.accessTokenEnc));
        } catch {
          // Segue cancelando localmente mesmo se falhar do lado do Facebook
          // (token expirado, post já publicado etc.) - não trava o usuário.
          externalDeleteFailed = true;
        }
      }
    }

    // Mesma lógica pro YouTube: o vídeo já foi enviado (privado + publishAt)
    // no momento do agendamento, então cancelar aqui precisa apagar de vez
    // do canal - senão ele publica sozinho no horário original mesmo tendo
    // sido "cancelado" no Orkestrya.
    if (card.scheduledNetwork === "YOUTUBE" && card.externalPostId && card.publishStatus !== "PUBLISHED") {
      const youtubeAccount = card.clientId
        ? await prisma.socialAccount.findUnique({
            where: { clientId_platform: { clientId: card.clientId, platform: "YOUTUBE" } },
          })
        : null;
      if (youtubeAccount) {
        try {
          await deleteYouTubeVideo(card.externalPostId, decryptSecret(youtubeAccount.accessTokenEnc));
        } catch {
          // Segue cancelando localmente mesmo se falhar do lado do YouTube.
          externalDeleteFailed = true;
        }
      }
    }

    return finishUpdate(
      {
        scheduledNetwork: null,
        scheduledAt: null,
        socialAccountId: null,
        publishStatus: null,
        publishError: null,
        externalPostId: null,
        publishedAt: null,
      },
      externalDeleteFailed ? 207 : 200,
    );
  }

  const socialAccount = card.clientId
    ? await prisma.socialAccount.findUnique({
        where: { clientId_platform: { clientId: card.clientId, platform: network } },
      })
    : null;

  // Sem conta conectada pra esse cliente/rede: fica como agendamento local,
  // igual já funcionava (ninguém perde a função por não ter conectado ainda).
  if (!socialAccount || socialAccount.status !== "ACTIVE") {
    return finishUpdate({
      scheduledNetwork: network,
      scheduledAt,
      socialAccountId: null,
      publishStatus: null,
      publishError: null,
    });
  }

  // Instagram, TikTok, LinkedIn e Threads não têm agendamento nativo: quem
  // publica na hora certa é o worker (scripts/publish-worker.ts), então aqui
  // só marca como pendente.
  if (network === "INSTAGRAM" || network === "TIKTOK" || network === "LINKEDIN" || network === "THREADS") {
    return finishUpdate({
      scheduledNetwork: network,
      scheduledAt,
      socialAccountId: socialAccount.id,
      publishStatus: "PENDING",
      publishError: null,
      externalPostId: null,
      publishedAt: null,
    });
  }

  // YouTube também agenda nativamente: envia o vídeo já com publishAt no
  // futuro (privado até lá), e o próprio YouTube libera como público sozinho
  // na hora certa - sem precisar de worker.
  if (network === "YOUTUBE") {
    const video = card.attachments.find((a) => a.type === "VIDEO");
    if (!video) {
      return finishUpdate(
        {
          scheduledNetwork: network,
          scheduledAt,
          socialAccountId: socialAccount.id,
          publishStatus: "FAILED",
          publishError: "O YouTube só aceita vídeo - anexe um vídeo na demanda antes de agendar.",
        },
        207,
      );
    }
    try {
      const accessToken = decryptSecret(socialAccount.accessTokenEnc);
      const { videoId } = await uploadYouTubeVideo({
        accessToken,
        videoUrl: absoluteUrl(video.url),
        title: card.title,
        description: card.description ?? undefined,
        publishAt: scheduledAt.toISOString(),
      });
      return finishUpdate({
        scheduledNetwork: network,
        scheduledAt,
        socialAccountId: socialAccount.id,
        publishStatus: "PENDING",
        publishError: null,
        externalPostId: videoId,
        publishedAt: null,
      });
    } catch (err) {
      return finishUpdate(
        {
          scheduledNetwork: network,
          scheduledAt,
          socialAccountId: socialAccount.id,
          publishStatus: "FAILED",
          publishError: err instanceof Error ? err.message : "Falha ao agendar no YouTube",
        },
        207,
      );
    }
  }

  // Facebook agenda nativamente: já entrega pra Meta na hora de confirmar.
  try {
    const pageToken = decryptSecret(socialAccount.accessTokenEnc);
    const externalPostId = await scheduleFacebookPost({
      pageId: socialAccount.externalAccountId,
      pageAccessToken: pageToken,
      message: card.description ?? card.title,
      imageUrl: card.attachments[0]?.type === "IMAGE" ? absoluteUrl(card.attachments[0].url) : undefined,
      scheduledAt,
    });
    return finishUpdate({
      scheduledNetwork: network,
      scheduledAt,
      socialAccountId: socialAccount.id,
      publishStatus: "PENDING",
      publishError: null,
      externalPostId,
      publishedAt: null,
    });
  } catch (err) {
    return finishUpdate(
      {
        scheduledNetwork: network,
        scheduledAt,
        socialAccountId: socialAccount.id,
        publishStatus: "FAILED",
        publishError: err instanceof Error ? err.message : "Falha ao agendar no Facebook",
      },
      207,
    );
  }
}
