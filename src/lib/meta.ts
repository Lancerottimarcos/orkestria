/**
 * Cliente da Graph API da Meta para conectar contas (OAuth) e publicar
 * conteúdo no Instagram e Facebook em nome de um cliente da agência.
 *
 * Baseado na documentação oficial:
 * - OAuth / Facebook Login para Empresas: https://developers.facebook.com/docs/facebook-login
 * - Publicação no Instagram: https://developers.facebook.com/docs/instagram-platform/content-publishing
 * - Publicação/agendamento no Facebook: https://developers.facebook.com/docs/pages-api/posts
 *
 * Este arquivo é só o cliente puro da Graph API - não sabe de onde vêm o App
 * ID/Secret. Quem chama passa essas credenciais (ver src/lib/metaConfig.ts,
 * que busca do painel Configurações → Integrações).
 */

export const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Instagram não tem agendamento nativo: o worker precisa publicar na hora H.
// Facebook agenda nativamente, respeitando essa janela mínima/máxima.
export const FACEBOOK_MIN_SCHEDULE_MINUTES = 10;
export const FACEBOOK_MAX_SCHEDULE_DAYS = 30;

export const META_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_read_engagement",
  "business_management",
].join(",");

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "MetaApiError";
  }
}

async function graphFetch(path: string, params: Record<string, string>, method: "GET" | "POST" | "DELETE" = "GET") {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const init: RequestInit = { method };
  if (method === "POST") {
    init.body = new URLSearchParams(params);
  } else {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new MetaApiError(json?.error?.message ?? `Erro na Graph API (${res.status})`, res.status, json);
  }
  return json;
}

/** Monta a URL do diálogo de login/permissões da Meta (Facebook Login). */
export function buildMetaOAuthUrl(state: string, appId: string, redirectUri: string): string {
  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

/** Troca o "code" do redirect OAuth por um token de usuário de curta duração. */
export async function exchangeCodeForUserToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string,
) {
  const json = await graphFetch("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });
  return json as { access_token: string; token_type: string; expires_in?: number };
}

/**
 * Troca um token de curta duração (ou já longo, perto de expirar) por um de
 * longa duração (~60 dias). Mesmo fluxo usado tanto na conexão inicial quanto
 * na renovação periódica.
 */
export async function exchangeForLongLivedToken(shortLivedToken: string, appId: string, appSecret: string) {
  const json = await graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
  return json as { access_token: string; token_type: string; expires_in: number };
}

/** ID da pessoa dona do token, usado pra ligar a conexão a ela (webhooks de desautorização/exclusão). */
export async function fetchMetaUserId(userAccessToken: string): Promise<string> {
  const json = await graphFetch("/me", { fields: "id", access_token: userAccessToken });
  return json.id as string;
}

export type ManagedPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

/** Lista as Páginas do Facebook que o usuário administra, com a conta do Instagram vinculada (se houver). */
export async function listManagedPages(userAccessToken: string): Promise<ManagedPage[]> {
  const json = await graphFetch("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userAccessToken,
    limit: "100",
  });
  return (json.data ?? []) as ManagedPage[];
}

// ---------- Instagram: fluxo em duas etapas, sem agendamento nativo ----------

async function createInstagramMediaContainer(params: {
  igUserId: string;
  pageAccessToken: string;
  imageUrl?: string;
  videoUrl?: string;
  caption?: string;
  isCarouselItem?: boolean;
  childrenIds?: string[];
}) {
  const { igUserId, pageAccessToken, imageUrl, videoUrl, caption, isCarouselItem, childrenIds } = params;
  const body: Record<string, string> = { access_token: pageAccessToken };
  if (childrenIds?.length) {
    body.media_type = "CAROUSEL";
    body.children = childrenIds.join(",");
  } else if (videoUrl) {
    body.media_type = "REELS";
    body.video_url = videoUrl;
  } else if (imageUrl) {
    body.image_url = imageUrl;
  }
  if (caption && !isCarouselItem) body.caption = caption;
  if (isCarouselItem) body.is_carousel_item = "true";

  const json = await graphFetch(`/${igUserId}/media`, body, "POST");
  return json.id as string;
}

/**
 * Cria o(s) container(s) de mídia e retorna o id pronto para publicar.
 * Suporta imagem/vídeo único ou carrossel (até 10 itens, limite da própria API).
 */
export async function createInstagramContainer(params: {
  igUserId: string;
  pageAccessToken: string;
  caption?: string;
  media: { url: string; type: "IMAGE" | "VIDEO" }[];
}): Promise<string> {
  const { igUserId, pageAccessToken, caption, media } = params;
  if (media.length === 0) throw new Error("Nenhuma arte anexada para publicar");

  if (media.length === 1) {
    const [item] = media;
    return createInstagramMediaContainer({
      igUserId,
      pageAccessToken,
      caption,
      imageUrl: item.type === "IMAGE" ? item.url : undefined,
      videoUrl: item.type === "VIDEO" ? item.url : undefined,
    });
  }

  const childrenIds = await Promise.all(
    media.slice(0, 10).map((item) =>
      createInstagramMediaContainer({
        igUserId,
        pageAccessToken,
        isCarouselItem: true,
        imageUrl: item.type === "IMAGE" ? item.url : undefined,
        videoUrl: item.type === "VIDEO" ? item.url : undefined,
      }),
    ),
  );
  return createInstagramMediaContainer({ igUserId, pageAccessToken, caption, childrenIds });
}

/** Publica um container já criado. Instagram não agenda: isso precisa rodar na hora exata. */
export async function publishInstagramContainer(params: {
  igUserId: string;
  pageAccessToken: string;
  creationId: string;
}): Promise<string> {
  const json = await graphFetch(
    `/${params.igUserId}/media_publish`,
    { creation_id: params.creationId, access_token: params.pageAccessToken },
    "POST",
  );
  return json.id as string;
}

// ---------- Facebook: agendamento nativo ----------

/**
 * Agenda um post na Página do Facebook usando o agendamento nativo da Meta
 * (published=false + scheduled_publish_time). Janela permitida pela API:
 * 10 minutos a 30 dias no futuro.
 */
export async function scheduleFacebookPost(params: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  imageUrl?: string;
  scheduledAt: Date;
}): Promise<string> {
  const { pageId, pageAccessToken, message, imageUrl, scheduledAt } = params;
  const scheduledUnix = Math.floor(scheduledAt.getTime() / 1000);
  const body: Record<string, string> = {
    access_token: pageAccessToken,
    published: "false",
    scheduled_publish_time: String(scheduledUnix),
  };

  if (imageUrl) {
    body.url = imageUrl;
    body.caption = message;
    const json = await graphFetch(`/${pageId}/photos`, body, "POST");
    return (json.post_id ?? json.id) as string;
  }

  body.message = message;
  const json = await graphFetch(`/${pageId}/feed`, body, "POST");
  return json.id as string;
}

/**
 * Publica na Página do Facebook imediatamente (sem published=false nem
 * scheduled_publish_time) - usado pelo "Publicar agora" mesmo quando a
 * demanda já tinha um agendamento nativo pra um horário futuro.
 */
export async function publishFacebookPostNow(params: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  imageUrl?: string;
}): Promise<string> {
  const { pageId, pageAccessToken, message, imageUrl } = params;
  const body: Record<string, string> = { access_token: pageAccessToken };

  if (imageUrl) {
    body.url = imageUrl;
    body.caption = message;
    const json = await graphFetch(`/${pageId}/photos`, body, "POST");
    return (json.post_id ?? json.id) as string;
  }

  body.message = message;
  const json = await graphFetch(`/${pageId}/feed`, body, "POST");
  return json.id as string;
}

/**
 * Cancela um post agendado nativamente no Facebook antes de ser publicado.
 * Chamado quando o usuário cancela o agendamento no Orkestrya, pra não
 * deixar o post "vivo" do lado do Facebook mesmo depois de removido daqui.
 */
export async function deleteFacebookPost(postId: string, pageAccessToken: string): Promise<void> {
  await graphFetch(`/${postId}`, { access_token: pageAccessToken }, "DELETE");
}

// ---------- Insights: métricas de conta (Instagram/Facebook) ----------

type InsightMetricValue = {
  name: string;
  values?: { value: number }[];
  total_value?: { value: number };
};

/**
 * A Graph API devolve dois formatos diferentes pro mesmo "valor de uma
 * métrica" dependendo do metric_type pedido: séries por período vêm em
 * `values[].value`, métricas "total_value" vêm em `total_value.value`.
 */
function lastMetricValue(json: { data?: InsightMetricValue[] }, metric: string): number | null {
  const entry = json.data?.find((m) => m.name === metric);
  if (!entry) return null;
  if (typeof entry.total_value?.value === "number") return entry.total_value.value;
  const last = entry.values?.[entry.values.length - 1]?.value;
  return typeof last === "number" ? last : null;
}

export type InstagramAccountInfo = { followersCount: number | null; mediaCount: number | null };

/** Contagem de seguidores/posts do IG - campos estáveis do objeto, não é insights. */
export async function fetchInstagramAccountInfo(
  igUserId: string,
  pageAccessToken: string,
): Promise<InstagramAccountInfo> {
  const json = await graphFetch(`/${igUserId}`, {
    fields: "followers_count,media_count",
    access_token: pageAccessToken,
  });
  return {
    followersCount: typeof json.followers_count === "number" ? json.followers_count : null,
    mediaCount: typeof json.media_count === "number" ? json.media_count : null,
  };
}

export type AccountInsights = {
  reach: number | null;
  impressions: number | null;
  profileViews: number | null;
  engagedAccounts: number | null;
  totalInteractions: number | null;
  profileLinkTaps: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  raw: unknown;
};

const EMPTY_ACCOUNT_INSIGHTS: Omit<AccountInsights, "raw"> = {
  reach: null,
  impressions: null,
  profileViews: null,
  engagedAccounts: null,
  totalInteractions: null,
  profileLinkTaps: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
};

/**
 * Métricas do dia do IG - o máximo que a API oficial oferece pra uma conta
 * business. Duas chamadas separadas porque a Graph API não deixa misturar
 * métricas "por período" (reach/profile_views/accounts_engaged) com métricas
 * "valor total" (curtidas, comentários etc.) numa única requisição. Cada
 * chamada é isolada: se uma falhar (nome de métrica mudou do lado da Meta),
 * só aquele grupo fica null, o resto segue normalmente.
 */
export async function fetchInstagramInsights(igUserId: string, pageAccessToken: string): Promise<AccountInsights> {
  const result: AccountInsights = { ...EMPTY_ACCOUNT_INSIGHTS, raw: {} };

  try {
    const json = await graphFetch(`/${igUserId}/insights`, {
      metric: "reach",
      period: "day",
      access_token: pageAccessToken,
    });
    result.reach = lastMetricValue(json, "reach");
    result.raw = { ...(result.raw as object), daily: json };
  } catch (err) {
    if (!(err instanceof MetaApiError)) throw err;
    result.raw = { ...(result.raw as object), dailyError: err.body };
  }

  try {
    const json = await graphFetch(`/${igUserId}/insights`, {
      metric: "profile_views,accounts_engaged,total_interactions,likes,comments,shares,saves,profile_links_taps",
      metric_type: "total_value",
      period: "day",
      access_token: pageAccessToken,
    });
    result.profileViews = lastMetricValue(json, "profile_views");
    result.engagedAccounts = lastMetricValue(json, "accounts_engaged");
    result.totalInteractions = lastMetricValue(json, "total_interactions");
    result.likes = lastMetricValue(json, "likes");
    result.comments = lastMetricValue(json, "comments");
    result.shares = lastMetricValue(json, "shares");
    result.saves = lastMetricValue(json, "saves");
    result.profileLinkTaps = lastMetricValue(json, "profile_links_taps");
    result.raw = { ...(result.raw as object), totals: json };
  } catch (err) {
    if (!(err instanceof MetaApiError)) throw err;
    result.raw = { ...(result.raw as object), totalsError: err.body };
  }

  return result;
}

export type FacebookPageInfo = { followers: number | null };

/** Curtidores/seguidores da Página - campo estável do objeto, não é insights. */
export async function fetchFacebookPageInfo(pageId: string, pageAccessToken: string): Promise<FacebookPageInfo> {
  const json = await graphFetch(`/${pageId}`, {
    fields: "fan_count,followers_count",
    access_token: pageAccessToken,
  });
  const followers = json.followers_count ?? json.fan_count;
  return { followers: typeof followers === "number" ? followers : null };
}

/**
 * Métricas do dia da Página - o máximo que a API oficial de Insights de
 * Página oferece hoje. page_impressions/page_impressions_unique/
 * page_engaged_users foram descontinuadas pela Meta (confirmado testando
 * contra a API real - erro "must be a valid insights metric") sem
 * substituto direto de alcance/impressões por página; só
 * page_post_engagements e page_views_total continuam válidas. Facebook
 * também não separa reações/comentários/compartilhamentos agregados por
 * página como o Instagram faz (esses só existem por post).
 */
export async function fetchFacebookPageInsights(pageId: string, pageAccessToken: string): Promise<AccountInsights> {
  try {
    const json = await graphFetch(`/${pageId}/insights`, {
      metric: "page_post_engagements,page_views_total",
      period: "day",
      access_token: pageAccessToken,
    });
    return {
      ...EMPTY_ACCOUNT_INSIGHTS,
      totalInteractions: lastMetricValue(json, "page_post_engagements"),
      profileViews: lastMetricValue(json, "page_views_total"),
      raw: json,
    };
  } catch (err) {
    if (err instanceof MetaApiError) return { ...EMPTY_ACCOUNT_INSIGHTS, raw: { error: err.body } };
    throw err;
  }
}

export type PostInsights = {
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  videoViews: number | null;
  raw: unknown;
};

const EMPTY_POST_INSIGHTS: Omit<PostInsights, "raw"> = {
  impressions: null,
  reach: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
  videoViews: null,
};

/**
 * Métricas de um post/mídia do Instagram já publicado (media id, não
 * container id). O conjunto de métricas válido varia por tipo de mídia
 * (feed/reels/carrossel) - tenta o conjunto completo primeiro e cai pra um
 * conjunto reduzido se a API rejeitar, em vez de desistir.
 */
export async function fetchInstagramMediaInsights(mediaId: string, pageAccessToken: string): Promise<PostInsights> {
  const attempts = [
    "impressions,reach,likes,comments,shares,saved,total_interactions,views",
    "reach,likes,comments,saved",
  ];
  for (const metric of attempts) {
    try {
      const json = await graphFetch(`/${mediaId}/insights`, { metric, access_token: pageAccessToken });
      return {
        ...EMPTY_POST_INSIGHTS,
        impressions: lastMetricValue(json, "impressions"),
        reach: lastMetricValue(json, "reach"),
        likes: lastMetricValue(json, "likes"),
        comments: lastMetricValue(json, "comments"),
        shares: lastMetricValue(json, "shares"),
        saves: lastMetricValue(json, "saved"),
        videoViews: lastMetricValue(json, "views"),
        raw: json,
      };
    } catch (err) {
      if (!(err instanceof MetaApiError)) throw err;
    }
  }
  return { ...EMPTY_POST_INSIGHTS, raw: null };
}

/**
 * Métricas de um post do Facebook já publicado. Curtidas/comentários/
 * compartilhamentos vêm dos campos-resumo do próprio objeto do post (não são
 * insights); impressões/alcance vêm do edge /insights.
 */
export async function fetchFacebookPostInsights(postId: string, pageAccessToken: string): Promise<PostInsights> {
  const result: PostInsights = { ...EMPTY_POST_INSIGHTS, raw: {} };

  try {
    const json = await graphFetch(`/${postId}`, {
      fields: "likes.summary(true).limit(0),comments.summary(true).limit(0),shares",
      access_token: pageAccessToken,
    });
    result.likes = typeof json.likes?.summary?.total_count === "number" ? json.likes.summary.total_count : null;
    result.comments =
      typeof json.comments?.summary?.total_count === "number" ? json.comments.summary.total_count : null;
    result.shares = typeof json.shares?.count === "number" ? json.shares.count : null;
    result.raw = { ...(result.raw as object), summary: json };
  } catch (err) {
    if (!(err instanceof MetaApiError)) throw err;
    result.raw = { ...(result.raw as object), summaryError: err.body };
  }

  try {
    const json = await graphFetch(`/${postId}/insights`, {
      metric: "post_impressions,post_impressions_unique",
      access_token: pageAccessToken,
    });
    result.impressions = lastMetricValue(json, "post_impressions");
    result.reach = lastMetricValue(json, "post_impressions_unique");
    result.raw = { ...(result.raw as object), insights: json };
  } catch (err) {
    if (!(err instanceof MetaApiError)) throw err;
    result.raw = { ...(result.raw as object), insightsError: err.body };
  }

  return result;
}
