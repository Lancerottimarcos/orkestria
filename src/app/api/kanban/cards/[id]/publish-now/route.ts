import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/authz";
import { decryptSecret } from "@/lib/crypto";
import {
  createInstagramContainer,
  publishInstagramContainer,
  publishFacebookPostNow,
  deleteFacebookPost,
} from "@/lib/meta";
import { initTikTokVideoPost, initTikTokPhotoPost, queryTikTokCreatorInfo } from "@/lib/tiktok";
import { publishYouTubeVideoNow } from "@/lib/youtube";
import { publishLinkedInPost } from "@/lib/linkedin";
import { publishThreadsPost } from "@/lib/threads";
import { CARD_INCLUDE, serializeCard, absoluteUrl } from "@/lib/kanbanSchedule";

type Params = { params: Promise<{ id: string }> };

/**
 * Publica uma demanda agendada agora mesmo, sem esperar o horário marcado.
 * Instagram e TikTok publicam direto (o worker só dispara na hora certa,
 * aqui a gente antecipa manualmente); Facebook, que já tinha sido agendado
 * nativamente pra um horário futuro, cancela o post agendado e publica um
 * novo imediatamente.
 */
export async function POST(_request: Request, { params }: Params) {
  const { error } = await requireModule("kanban");
  if (error) return error;

  const { id } = await params;
  const card = await prisma.kanbanCard.findUnique({
    where: { id },
    include: { attachments: { orderBy: { position: "asc" } }, socialAccount: true },
  });
  if (!card) return Response.json({ error: "Demanda não encontrada" }, { status: 404 });
  if (!card.scheduledNetwork) return Response.json({ error: "Essa demanda não está agendada" }, { status: 400 });
  if (card.publishStatus === "PUBLISHED") {
    return Response.json({ error: "Essa publicação já foi publicada" }, { status: 400 });
  }
  if (!card.socialAccount || card.socialAccount.status !== "ACTIVE") {
    return Response.json({ error: "Nenhuma conta conectada e ativa pra essa rede" }, { status: 400 });
  }
  // Anexos do tipo FILE (pdf/doc/xlsx) não podem ser publicados em rede
  // social - só arte (imagem/vídeo) conta pra esse fluxo.
  const media = card.attachments.filter(
    (a): a is (typeof card.attachments)[number] & { type: "IMAGE" | "VIDEO" } => a.type !== "FILE",
  );
  if (media.length === 0) {
    return Response.json({ error: "Adicione uma arte antes de publicar" }, { status: 400 });
  }

  async function finish(data: Record<string, unknown>) {
    const updated = await prisma.kanbanCard.update({ where: { id }, data, include: CARD_INCLUDE });
    return Response.json(serializeCard(updated));
  }

  try {
    if (card.scheduledNetwork === "INSTAGRAM") {
      const pageToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const creationId = await createInstagramContainer({
        igUserId: card.socialAccount.externalAccountId,
        pageAccessToken: pageToken,
        caption: card.description ?? card.title,
        media: media.map((a) => ({ url: absoluteUrl(a.url), type: a.type })),
      });
      const externalPostId = await publishInstagramContainer({
        igUserId: card.socialAccount.externalAccountId,
        pageAccessToken: pageToken,
        creationId,
      });
      return finish({ publishStatus: "PUBLISHED", externalPostId, publishedAt: new Date(), publishError: null });
    }

    if (card.scheduledNetwork === "TIKTOK") {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const creator = await queryTikTokCreatorInfo(accessToken);
      const privacyLevel = (creator.privacy_level_options.includes("PUBLIC_TO_EVERYONE")
        ? "PUBLIC_TO_EVERYONE"
        : creator.privacy_level_options[0]) as "PUBLIC_TO_EVERYONE" | "SELF_ONLY" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR";
      const caption = card.description ?? card.title;
      const firstType = media[0].type;

      let publishId: string;
      if (firstType === "VIDEO") {
        const result = await initTikTokVideoPost({
          accessToken,
          videoUrl: absoluteUrl(media[0].url),
          postInfo: { title: caption, privacyLevel },
        });
        publishId = result.publishId;
      } else {
        const photoUrls = media.filter((a) => a.type === "IMAGE").map((a) => absoluteUrl(a.url));
        const result = await initTikTokPhotoPost({
          accessToken,
          photoUrls,
          postInfo: { title: card.title, description: caption, privacyLevel },
        });
        publishId = result.publishId;
      }

      // Fica em PUBLISHING: o init só inicia o processamento assíncrono do
      // lado do TikTok - o worker (pollProcessingTikTokPosts) confirma a
      // publicação de fato nos próximos ciclos, igual a um post agendado normal.
      return finish({ publishStatus: "PUBLISHING", externalPostId: publishId, publishError: null });
    }

    if (card.scheduledNetwork === "FACEBOOK") {
      const pageToken = decryptSecret(card.socialAccount.accessTokenEnc);
      if (card.externalPostId) {
        try {
          await deleteFacebookPost(card.externalPostId, pageToken);
        } catch {
          // Segue publicando mesmo se o cancelamento do agendamento antigo falhar.
        }
      }
      const externalPostId = await publishFacebookPostNow({
        pageId: card.socialAccount.externalAccountId,
        pageAccessToken: pageToken,
        message: card.description ?? card.title,
        imageUrl: media[0]?.type === "IMAGE" ? absoluteUrl(media[0].url) : undefined,
      });
      return finish({ publishStatus: "PUBLISHED", externalPostId, publishedAt: new Date(), publishError: null });
    }

    if (card.scheduledNetwork === "LINKEDIN") {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const organizationUrn = `urn:li:organization:${card.socialAccount.externalAccountId}`;
      const first = media[0];
      const { postUrn } = await publishLinkedInPost({
        accessToken,
        organizationUrn,
        commentary: card.description ?? card.title,
        attachment: first && (first.type === "IMAGE" || first.type === "VIDEO") ? { type: first.type, url: absoluteUrl(first.url) } : undefined,
      });
      return finish({ publishStatus: "PUBLISHED", externalPostId: postUrn, publishedAt: new Date(), publishError: null });
    }

    if (card.scheduledNetwork === "THREADS") {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const first = media[0];
      const { postId } = await publishThreadsPost({
        accessToken,
        threadsUserId: card.socialAccount.externalAccountId,
        text: card.description ?? card.title,
        attachment: first && (first.type === "IMAGE" || first.type === "VIDEO") ? { type: first.type, url: absoluteUrl(first.url) } : undefined,
      });
      return finish({ publishStatus: "PUBLISHED", externalPostId: postId, publishedAt: new Date(), publishError: null });
    }

    if (card.scheduledNetwork === "YOUTUBE") {
      // O vídeo já foi enviado no momento do agendamento (privado + publishAt
      // no futuro) - "publicar agora" só troca o status pra público, sem
      // reenviar o arquivo.
      if (!card.externalPostId) {
        return Response.json({ error: "Vídeo ainda não foi enviado ao YouTube" }, { status: 400 });
      }
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      await publishYouTubeVideoNow(card.externalPostId, accessToken);
      return finish({ publishStatus: "PUBLISHED", publishedAt: new Date(), publishError: null });
    }

    return Response.json({ error: "Rede não suportada" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao publicar agora";
    await prisma.kanbanCard.update({ where: { id }, data: { publishStatus: "FAILED", publishError: message } });
    return Response.json({ error: message }, { status: 500 });
  }
}
