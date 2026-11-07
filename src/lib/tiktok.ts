/**
 * Cliente da Content Posting API do TikTok para conectar contas (OAuth via
 * Login Kit) e publicar conteúdo em nome de um cliente da agência.
 *
 * Baseado na documentação oficial (consultada em agosto/2026):
 * - Login Kit (web): https://developers.tiktok.com/doc/login-kit-web
 * - Gerenciamento de token: https://developers.tiktok.com/doc/oauth-user-access-token-management
 * - Content Posting API (vídeo): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 * - Content Posting API (foto): https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
 * - Status da publicação: https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
 * - Escopos: https://developers.tiktok.com/doc/tiktok-api-scopes
 *
 * Este arquivo é só o cliente puro da API - não sabe de onde vêm o Client
 * Key/Secret. Quem chama passa essas credenciais (ver src/lib/tiktokConfig.ts,
 * que busca do painel Configurações → Integrações).
 *
 * Diferenças importantes em relação à Meta:
 * - Não existe agendamento nativo (igual o Instagram): o worker precisa
 *   publicar na hora H (ver scripts/publish-worker.ts).
 * - O token de acesso dura só 24h (contra ~60 dias da Meta) e o refresh
 *   token dura 365 dias e é rotacionado a cada uso - por isso o
 *   SocialAccount guarda refreshTokenEnc/refreshTokenExpiresAt além do
 *   accessTokenEnc/tokenExpiresAt que a Meta já usava.
 * - Um único login já autoriza uma única conta (não existe o conceito de
 *   "Páginas" do Facebook), então não precisa do fluxo de escolha
 *   pending/finalize que a Meta tem para múltiplas Páginas.
 * - Publicação pública (privacy_level PUBLIC_TO_EVERYONE) só funciona depois
 *   que o app passa pela auditoria do TikTok para o escopo video.publish;
 *   sem auditoria, todo conteúdo é forçado a "somente eu" (SELF_ONLY).
 * - PULL_FROM_URL (usado aqui, mesmo padrão que a Meta usa hoje) exige que o
 *   domínio que serve os anexos esteja verificado no TikTok for Developers
 *   (Properties → Verified Domains) - sem isso as chamadas de init retornam
 *   erro. É um passo de configuração no painel deles, não requer código.
 * - Exige PKCE mesmo em app web (confirmado testando ao vivo contra
 *   https://www.tiktok.com/v2/auth/authorize/, que rejeita a requisição com
 *   "code_challenge" ausente - a documentação oficial só descreve PKCE como
 *   obrigatório pra desktop/iOS/Android, mas na prática o endpoint real
 *   também exige pra web). Detalhe importante: o code_challenge do TikTok é
 *   SHA-256 do code_verifier em hex, não em base64url como é mais comum em
 *   outros provedores OAuth - ver generateTikTokPkcePair abaixo.
 */

import crypto from "crypto";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";
const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = `${TIKTOK_API_BASE}/oauth/token/`;
const TIKTOK_REVOKE_URL = `${TIKTOK_API_BASE}/oauth/revoke/`;

// Cada user access_token aceita só 6 chamadas de publicação por minuto (init)
// e 30 de consulta de status por minuto - o worker já respeita isso rodando
// a cada 60s e processando poucos posts por vez.
// video.upload não está aqui de propósito: só teria uso se a gente
// implementasse o fluxo de rascunho/caixa de entrada do TikTok, que não
// existe neste código - toda publicação usa Direct Post (video.publish).
export const TIKTOK_OAUTH_SCOPES = ["user.info.basic", "video.publish"].join(",");

export class TikTokApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

async function tiktokFetch(path: string, init: RequestInit & { accessToken?: string }) {
  const { accessToken, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof URLSearchParams)) {
    headers.set("Content-Type", "application/json; charset=UTF-8");
  }
  const res = await fetch(`${TIKTOK_API_BASE}${path}`, { ...rest, headers });
  const json = await res.json().catch(() => ({}));
  const errorCode = json?.error?.code;
  if (!res.ok || (errorCode && errorCode !== "ok")) {
    throw new TikTokApiError(json?.error?.message ?? `Erro na API do TikTok (${res.status})`, res.status, json);
  }
  return json;
}

const PKCE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

/**
 * Gera o par PKCE exigido pelo TikTok. Diferente do padrão mais comum
 * (base64url), o code_challenge do TikTok é o SHA-256 do code_verifier
 * codificado em hex - usar base64url aqui faz a troca do code por token
 * falhar silenciosamente com "invalid PKCE code verifier".
 */
export function generateTikTokPkcePair(): { codeVerifier: string; codeChallenge: string } {
  const bytes = crypto.randomBytes(96);
  let codeVerifier = "";
  for (let i = 0; i < 64; i++) codeVerifier += PKCE_CHARSET[bytes[i] % PKCE_CHARSET.length];
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier, "utf8").digest("hex");
  return { codeVerifier, codeChallenge };
}

/** Monta a URL do diálogo de autorização do TikTok (Login Kit). */
export function buildTikTokOAuthUrl(
  state: string,
  clientKey: string,
  redirectUri: string,
  codeChallenge: string,
): string {
  const url = new URL(TIKTOK_AUTH_URL);
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", TIKTOK_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export type TikTokTokenResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
  token_type: string;
};

/** Troca o "code" do redirect OAuth pelo par access_token/refresh_token. */
export async function exchangeCodeForTikTokToken(
  code: string,
  clientKey: string,
  clientSecret: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<TikTokTokenResult> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new TikTokApiError(
      json?.error_description ?? json?.message ?? `Erro ao trocar o code por token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as TikTokTokenResult;
}

/**
 * Renova o access_token usando o refresh_token. O TikTok rotaciona o
 * refresh_token a cada renovação - sempre salvar o novo valor retornado.
 */
export async function refreshTikTokToken(
  refreshToken: string,
  clientKey: string,
  clientSecret: string,
): Promise<TikTokTokenResult> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new TikTokApiError(
      json?.error_description ?? json?.message ?? `Erro ao renovar o token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as TikTokTokenResult;
}

/** Revoga o token (usado ao desconectar a conta). Falha silenciosa é aceitável aqui. */
export async function revokeTikTokToken(accessToken: string, clientKey: string, clientSecret: string) {
  await fetch(TIKTOK_REVOKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, token: accessToken }),
  }).catch(() => null);
}

export type TikTokCreatorInfo = {
  creator_avatar_url: string;
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

/**
 * Consulta as opções de privacidade/interação e dados básicos do criador.
 * Obrigatório antes de publicar, tanto pra saber qual privacy_level é válido
 * quanto pra exibir nome/avatar de quem vai receber a publicação.
 */
export async function queryTikTokCreatorInfo(accessToken: string): Promise<TikTokCreatorInfo> {
  const json = await tiktokFetch("/post/publish/creator_info/query/", {
    method: "POST",
    accessToken,
  });
  return json.data as TikTokCreatorInfo;
}

export type TikTokPostInfo = {
  title?: string;
  privacyLevel: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
  isAigc?: boolean;
};

/**
 * Inicia a publicação de um vídeo via PULL_FROM_URL (o TikTok baixa direto
 * da nossa URL pública de anexos - mesmo padrão que a Meta já usa). Exige
 * domínio verificado no painel do TikTok for Developers.
 */
export async function initTikTokVideoPost(params: {
  accessToken: string;
  videoUrl: string;
  postInfo: TikTokPostInfo;
}): Promise<{ publishId: string }> {
  const { accessToken, videoUrl, postInfo } = params;
  const json = await tiktokFetch("/post/publish/video/init/", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      post_info: {
        title: postInfo.title,
        privacy_level: postInfo.privacyLevel,
        disable_comment: postInfo.disableComment ?? false,
        disable_duet: postInfo.disableDuet ?? false,
        disable_stitch: postInfo.disableStitch ?? false,
        brand_content_toggle: postInfo.brandContentToggle ?? false,
        brand_organic_toggle: postInfo.brandOrganicToggle ?? false,
        is_aigc: postInfo.isAigc ?? false,
      },
      source_info: { source: "PULL_FROM_URL", video_url: videoUrl },
    }),
  });
  return { publishId: json.data.publish_id as string };
}

/**
 * Inicia a publicação de foto(s) via PULL_FROM_URL - até 35 imagens por
 * publicação (a API monta carrossel automaticamente com mais de uma).
 * Também exige domínio verificado.
 */
export async function initTikTokPhotoPost(params: {
  accessToken: string;
  photoUrls: string[];
  postInfo: Omit<TikTokPostInfo, "disableDuet" | "disableStitch"> & { description?: string };
  coverIndex?: number;
}): Promise<{ publishId: string }> {
  const { accessToken, photoUrls, postInfo, coverIndex = 0 } = params;
  const json = await tiktokFetch("/post/publish/content/init/", {
    method: "POST",
    accessToken,
    body: JSON.stringify({
      media_type: "PHOTO",
      post_mode: "DIRECT_POST",
      post_info: {
        title: postInfo.title,
        description: postInfo.description,
        privacy_level: postInfo.privacyLevel,
        disable_comment: postInfo.disableComment ?? false,
        brand_content_toggle: postInfo.brandContentToggle ?? false,
        brand_organic_toggle: postInfo.brandOrganicToggle ?? false,
        auto_add_music: true,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_images: photoUrls.slice(0, 35),
        photo_cover_index: coverIndex,
      },
    }),
  });
  return { publishId: json.data.publish_id as string };
}

export type TikTokPublishStatus = {
  status: "PROCESSING_UPLOAD" | "PROCESSING_DOWNLOAD" | "SEND_TO_USER_INBOX" | "PUBLISH_COMPLETE" | "FAILED";
  fail_reason?: string;
  publicaly_available_post_id?: string[];
};

/** Consulta o status de uma publicação iniciada (o init só devolve o publish_id - a publicação em si é assíncrona). */
export async function fetchTikTokPublishStatus(accessToken: string, publishId: string): Promise<TikTokPublishStatus> {
  const json = await tiktokFetch("/post/publish/status/fetch/", {
    method: "POST",
    accessToken,
    body: JSON.stringify({ publish_id: publishId }),
  });
  return json.data as TikTokPublishStatus;
}
