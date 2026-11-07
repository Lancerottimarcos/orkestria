/**
 * Worker de publicação agendada. Roda continuamente (via PM2, processo
 * separado do app Next.js) e, a cada minuto:
 *
 * 1. Renova tokens de contas conectadas que vencem em breve (Meta: janela de
 *    7 dias, token dura ~60 dias; TikTok: janela de 2h, token dura só 24h).
 * 2. Publica de verdade no Instagram e no TikTok as demandas cujo horário
 *    agendado já chegou - nenhum dos dois tem agendamento nativo na API,
 *    então quem dispara a publicação na hora certa é este processo.
 * 3. Consulta o status das publicações do TikTok que ainda estão em
 *    processamento (o init da Content Posting API só devolve um publish_id -
 *    a publicação em si acontece de forma assíncrona do lado do TikTok).
 *
 * O Facebook e o YouTube já agendam nativamente (o Facebook no momento em
 * que a pessoa confirma o agendamento, ver src/app/api/kanban/cards/[id]/
 * schedule; o YouTube já sobe o vídeo como privado com publishAt no momento
 * do agendamento, ver src/lib/kanbanSchedule.ts) - este worker só precisa
 * renovar o token deles periodicamente, não publicar nada na hora certa.
 *
 * O LinkedIn também é publicado por este worker na hora certa (mesmo caso do
 * Instagram/TikTok - sem agendamento nativo), mas SEM renovação automática
 * de token: o LinkedIn só emite refresh_token pra parceiros aprovados no
 * programa "Programmatic Refresh Tokens" (não é o caso aqui), então o
 * access_token (60 dias fixos) não tem como ser renovado por este processo -
 * ao vencer, a conta só é marcada como expirada localmente pra avisar que
 * precisa reconectar manualmente (ver markExpiredLinkedInTokens).
 *
 * O Threads (Meta) também é publicado por este worker (sem agendamento
 * nativo) e, diferente do LinkedIn, TEM renovação automática: o token de
 * longa duração (60 dias) pode ser renovado enquanto tiver pelo menos 24h de
 * idade e ainda não tiver expirado - a janela de renovação escolhida aqui
 * (dias antes do vencimento) garante folga bem maior que 24h.
 *
 * Uso: node --loader tsx scripts/publish-worker.ts (ou via pm2, ver README).
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { decryptSecret, encryptSecret } from "../src/lib/crypto.js";
import {
  createInstagramContainer,
  publishInstagramContainer,
  exchangeForLongLivedToken,
} from "../src/lib/meta.js";
import {
  initTikTokVideoPost,
  initTikTokPhotoPost,
  fetchTikTokPublishStatus,
  refreshTikTokToken,
  queryTikTokCreatorInfo,
} from "../src/lib/tiktok.js";
import { refreshGoogleToken } from "../src/lib/youtube.js";
import { publishLinkedInPost } from "../src/lib/linkedin.js";
import { publishThreadsPost, refreshThreadsToken } from "../src/lib/threads.js";
import { syncDueSocialMetrics, syncDuePostMetrics } from "../src/lib/socialMetrics.js";
import { sendDailyDigestIfDue } from "../src/lib/dailyDigest.js";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const POLL_INTERVAL_MS = 60_000;
const TOKEN_REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TIKTOK_TOKEN_REFRESH_WINDOW_MS = 2 * 60 * 60 * 1000;
// Token de acesso do Google dura só ~1h (bem mais curto que Meta/TikTok) -
// janela de 15min garante que sempre tem um ciclo de sobra antes de expirar.
const YOUTUBE_TOKEN_REFRESH_WINDOW_MS = 15 * 60 * 1000;

function log(msg: string) {
  console.log(`[publish-worker] ${new Date().toISOString()} ${msg}`);
}

/** Credenciais do app cadastradas no painel Configurações → Integrações (não em .env). */
async function loadAppCredentials(): Promise<{ appId: string; appSecret: string } | null> {
  const config = await prisma.metaAppConfig.findUnique({ where: { id: "meta" } });
  if (!config?.appId || !config.appSecretEnc) return null;
  return { appId: config.appId, appSecret: decryptSecret(config.appSecretEnc) };
}

async function refreshExpiringTokens() {
  const credentials = await loadAppCredentials();
  if (!credentials) return;

  const soon = new Date(Date.now() + TOKEN_REFRESH_WINDOW_MS);
  const accounts = await prisma.socialAccount.findMany({
    // Faltava filtrar por rede: sem isso, uma conta do TikTok recém-conectada
    // (token válido por só 24h) sempre cai dentro dessa janela de 7 dias e
    // essa função tentava renovar ela como se fosse um token da Meta - o
    // TikTok renova numa função própria (refreshExpiringTikTokTokens), essa
    // aqui é só pra Facebook/Instagram.
    where: {
      status: "ACTIVE",
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
      tokenExpiresAt: { not: null, lte: soon },
    },
  });
  for (const account of accounts) {
    try {
      const currentToken = decryptSecret(account.accessTokenEnc);
      const refreshed = await exchangeForLongLivedToken(currentToken, credentials.appId, credentials.appSecret);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encryptSecret(refreshed.access_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          status: "ACTIVE",
          lastError: null,
        },
      });
      log(`token renovado: ${account.name} (${account.platform})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao renovar token";
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED", lastError: message },
      });
      log(`falha ao renovar token de ${account.name}: ${message}`);
    }
  }
}

/** Credenciais do app do TikTok cadastradas no painel Configurações → Integrações (não em .env). */
async function loadTikTokAppCredentials(): Promise<{ clientKey: string; clientSecret: string } | null> {
  const config = await prisma.tikTokAppConfig.findUnique({ where: { id: "tiktok" } });
  if (!config?.clientKey || !config.clientSecretEnc) return null;
  return { clientKey: config.clientKey, clientSecret: decryptSecret(config.clientSecretEnc) };
}

async function refreshExpiringTikTokTokens() {
  const credentials = await loadTikTokAppCredentials();
  if (!credentials) return;

  const soon = new Date(Date.now() + TIKTOK_TOKEN_REFRESH_WINDOW_MS);
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "TIKTOK", status: "ACTIVE", tokenExpiresAt: { not: null, lte: soon } },
  });
  for (const account of accounts) {
    if (!account.refreshTokenEnc) continue;
    try {
      const refreshToken = decryptSecret(account.refreshTokenEnc);
      const refreshed = await refreshTikTokToken(refreshToken, credentials.clientKey, credentials.clientSecret);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encryptSecret(refreshed.access_token),
          refreshTokenEnc: encryptSecret(refreshed.refresh_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          refreshTokenExpiresAt: new Date(Date.now() + refreshed.refresh_expires_in * 1000),
          status: "ACTIVE",
          lastError: null,
        },
      });
      log(`token renovado: ${account.name} (${account.platform})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao renovar token";
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED", lastError: message },
      });
      log(`falha ao renovar token de ${account.name}: ${message}`);
    }
  }
}

/** Credenciais do projeto Google (Client ID + Secret) cadastradas no painel Configurações → Integrações (não em .env). */
async function loadYouTubeAppCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  const config = await prisma.youTubeAppConfig.findUnique({ where: { id: "youtube" } });
  if (!config?.clientId || !config.clientSecretEnc) return null;
  return { clientId: config.clientId, clientSecret: decryptSecret(config.clientSecretEnc) };
}

async function refreshExpiringYouTubeTokens() {
  const credentials = await loadYouTubeAppCredentials();
  if (!credentials) return;

  const soon = new Date(Date.now() + YOUTUBE_TOKEN_REFRESH_WINDOW_MS);
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "YOUTUBE", status: "ACTIVE", tokenExpiresAt: { not: null, lte: soon } },
  });
  for (const account of accounts) {
    if (!account.refreshTokenEnc) continue;
    try {
      const refreshToken = decryptSecret(account.refreshTokenEnc);
      const refreshed = await refreshGoogleToken(refreshToken, credentials.clientId, credentials.clientSecret);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encryptSecret(refreshed.access_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          status: "ACTIVE",
          lastError: null,
        },
      });
      log(`token renovado: ${account.name} (${account.platform})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao renovar token";
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED", lastError: message },
      });
      log(`falha ao renovar token de ${account.name}: ${message}`);
    }
  }
}

/**
 * Marca localmente como EXPIRED as contas do LinkedIn cujo token já venceu -
 * não tem chamada de API pra fazer (sem refresh_token programático), então
 * isso só existe pra a conta aparecer como "Expirada" no painel antes que
 * alguém tente publicar e tome um erro genérico da API.
 */
async function markExpiredLinkedInTokens() {
  await prisma.socialAccount.updateMany({
    where: { platform: "LINKEDIN", status: "ACTIVE", tokenExpiresAt: { not: null, lte: new Date() } },
    data: { status: "EXPIRED", lastError: "Token do LinkedIn expirado (60 dias) - reconecte a conta." },
  });
}

async function publishDueLinkedInPosts() {
  const due = await prisma.kanbanCard.findMany({
    where: {
      scheduledNetwork: "LINKEDIN",
      publishStatus: "PENDING",
      scheduledAt: { lte: new Date() },
      socialAccountId: { not: null },
    },
    include: { attachments: { orderBy: { position: "asc" } }, socialAccount: true },
  });

  for (const card of due) {
    if (!card.socialAccount) continue;
    await prisma.kanbanCard.update({ where: { id: card.id }, data: { publishStatus: "PUBLISHING" } });
    try {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const organizationUrn = `urn:li:organization:${card.socialAccount.externalAccountId}`;
      const first = card.attachments[0];
      const { postUrn } = await publishLinkedInPost({
        accessToken,
        organizationUrn,
        commentary: card.description ?? card.title,
        attachment: first && (first.type === "IMAGE" || first.type === "VIDEO") ? { type: first.type, url: absoluteUrl(first.url) } : undefined,
      });
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "PUBLISHED", externalPostId: postUrn, publishedAt: new Date(), publishError: null },
      });
      log(`publicado no LinkedIn: "${card.title}" (${postUrn})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao publicar no LinkedIn";
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "FAILED", publishError: message },
      });
      log(`falha ao publicar "${card.title}" no LinkedIn: ${message}`);
    }
  }
}

const THREADS_TOKEN_REFRESH_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

async function refreshExpiringThreadsTokens() {
  const soon = new Date(Date.now() + THREADS_TOKEN_REFRESH_WINDOW_MS);
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: "THREADS", status: "ACTIVE", tokenExpiresAt: { not: null, lte: soon } },
  });
  for (const account of accounts) {
    try {
      const currentToken = decryptSecret(account.accessTokenEnc);
      const refreshed = await refreshThreadsToken(currentToken);
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEnc: encryptSecret(refreshed.access_token),
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
          status: "ACTIVE",
          lastError: null,
        },
      });
      log(`token renovado: ${account.name} (${account.platform})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao renovar token";
      await prisma.socialAccount.update({
        where: { id: account.id },
        data: { status: "EXPIRED", lastError: message },
      });
      log(`falha ao renovar token de ${account.name}: ${message}`);
    }
  }
}

async function publishDueThreadsPosts() {
  const due = await prisma.kanbanCard.findMany({
    where: {
      scheduledNetwork: "THREADS",
      publishStatus: "PENDING",
      scheduledAt: { lte: new Date() },
      socialAccountId: { not: null },
    },
    include: { attachments: { orderBy: { position: "asc" } }, socialAccount: true },
  });

  for (const card of due) {
    if (!card.socialAccount) continue;
    await prisma.kanbanCard.update({ where: { id: card.id }, data: { publishStatus: "PUBLISHING" } });
    try {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const first = card.attachments[0];
      const { postId } = await publishThreadsPost({
        accessToken,
        threadsUserId: card.socialAccount.externalAccountId,
        text: card.description ?? card.title,
        attachment: first && (first.type === "IMAGE" || first.type === "VIDEO") ? { type: first.type, url: absoluteUrl(first.url) } : undefined,
      });
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "PUBLISHED", externalPostId: postId, publishedAt: new Date(), publishError: null },
      });
      log(`publicado no Threads: "${card.title}" (${postId})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao publicar no Threads";
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "FAILED", publishError: message },
      });
      log(`falha ao publicar "${card.title}" no Threads: ${message}`);
    }
  }
}

async function publishDueTikTokPosts() {
  const due = await prisma.kanbanCard.findMany({
    where: {
      scheduledNetwork: "TIKTOK",
      publishStatus: "PENDING",
      scheduledAt: { lte: new Date() },
      socialAccountId: { not: null },
    },
    include: { attachments: { orderBy: { position: "asc" } }, socialAccount: true },
  });

  for (const card of due) {
    // Anexos do tipo FILE (pdf/doc/xlsx) não podem ser publicados no TikTok -
    // só arte (imagem/vídeo) conta pra esse fluxo.
    const media = card.attachments.filter(
      (a): a is (typeof card.attachments)[number] & { type: "IMAGE" | "VIDEO" } => a.type !== "FILE",
    );
    if (!card.socialAccount || media.length === 0) continue;
    await prisma.kanbanCard.update({ where: { id: card.id }, data: { publishStatus: "PUBLISHING" } });
    try {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      // Sem auditoria aprovada pro escopo video.publish, o TikTok só libera
      // SELF_ONLY - por isso a privacidade é sempre a opção mais aberta que
      // o próprio TikTok disser que está disponível pra essa conta, nunca um
      // valor fixo no código.
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

      // Fica em PUBLISHING (não PUBLISHED ainda): o init só inicia o
      // processamento assíncrono do lado do TikTok. Quem confirma a
      // publicação de fato é pollProcessingTikTokPosts, a cada ciclo.
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { externalPostId: publishId, publishError: null },
      });
      log(`publicação iniciada no TikTok: "${card.title}" (${publishId})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao publicar no TikTok";
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "FAILED", publishError: message },
      });
      log(`falha ao publicar "${card.title}" no TikTok: ${message}`);
    }
  }
}

/** Consulta o status das publicações do TikTok ainda em processamento (init assíncrono). */
async function pollProcessingTikTokPosts() {
  const processing = await prisma.kanbanCard.findMany({
    where: { scheduledNetwork: "TIKTOK", publishStatus: "PUBLISHING", externalPostId: { not: null } },
    include: { socialAccount: true },
  });

  for (const card of processing) {
    if (!card.socialAccount || !card.externalPostId) continue;
    try {
      const accessToken = decryptSecret(card.socialAccount.accessTokenEnc);
      const result = await fetchTikTokPublishStatus(accessToken, card.externalPostId);
      if (result.status === "PUBLISH_COMPLETE" || result.status === "SEND_TO_USER_INBOX") {
        await prisma.kanbanCard.update({
          where: { id: card.id },
          data: { publishStatus: "PUBLISHED", publishedAt: new Date(), publishError: null },
        });
        log(`publicado no TikTok: "${card.title}" (${card.externalPostId})`);
      } else if (result.status === "FAILED") {
        await prisma.kanbanCard.update({
          where: { id: card.id },
          data: { publishStatus: "FAILED", publishError: result.fail_reason ?? "Falha ao publicar no TikTok" },
        });
        log(`falha ao publicar "${card.title}" no TikTok: ${result.fail_reason}`);
      }
      // PROCESSING_UPLOAD / PROCESSING_DOWNLOAD: ainda processando, checa de novo no próximo ciclo.
    } catch (err) {
      log(`falha ao consultar status do TikTok de "${card.title}": ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function publishDueInstagramPosts() {
  const due = await prisma.kanbanCard.findMany({
    where: {
      scheduledNetwork: "INSTAGRAM",
      publishStatus: "PENDING",
      scheduledAt: { lte: new Date() },
      socialAccountId: { not: null },
    },
    include: { attachments: { orderBy: { position: "asc" } }, socialAccount: true },
  });

  for (const card of due) {
    if (!card.socialAccount) continue;
    await prisma.kanbanCard.update({ where: { id: card.id }, data: { publishStatus: "PUBLISHING" } });
    try {
      const pageToken = decryptSecret(card.socialAccount.accessTokenEnc);
      // Anexos do tipo FILE (pdf/doc/xlsx) não podem ser publicados no
      // Instagram - só arte (imagem/vídeo) conta pra esse fluxo.
      const media = card.attachments.filter(
        (a): a is (typeof card.attachments)[number] & { type: "IMAGE" | "VIDEO" } => a.type !== "FILE",
      );
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
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "PUBLISHED", externalPostId, publishedAt: new Date(), publishError: null },
      });
      log(`publicado no Instagram: "${card.title}" (${externalPostId})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao publicar no Instagram";
      await prisma.kanbanCard.update({
        where: { id: card.id },
        data: { publishStatus: "FAILED", publishError: message },
      });
      log(`falha ao publicar "${card.title}": ${message}`);
    }
  }
}

function absoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base}${url}`;
}

async function tick() {
  try {
    await refreshExpiringTokens();
    await refreshExpiringTikTokTokens();
    await refreshExpiringYouTubeTokens();
    await markExpiredLinkedInTokens();
    await refreshExpiringThreadsTokens();
    await publishDueInstagramPosts();
    await publishDueTikTokPosts();
    await pollProcessingTikTokPosts();
    await publishDueLinkedInPosts();
    await publishDueThreadsPosts();
    await syncDueSocialMetrics(prisma);
    await syncDuePostMetrics(prisma);
    await sendDailyDigestIfDue(prisma);
  } catch (err) {
    log(`erro no ciclo: ${err instanceof Error ? err.message : err}`);
  }
}

async function main() {
  log("worker iniciado, checando a cada 60s");
  await tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
