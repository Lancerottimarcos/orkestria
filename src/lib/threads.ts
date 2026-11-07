/**
 * Cliente da API do Threads (Meta) para conectar o perfil de cada cliente da
 * agência e agendar/publicar conteúdo.
 *
 * Baseado na documentação oficial (consultada em agosto/2026):
 * - Get Started: https://developers.facebook.com/docs/threads/get-started
 * - Tokens e permissões: https://developers.facebook.com/docs/threads/get-started/get-access-tokens-and-permissions
 * - Tokens de longa duração: https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
 * - Perfis: https://developers.facebook.com/docs/threads/threads-profiles
 * - Posts/mídia: https://developers.facebook.com/docs/threads/posts, threads-media
 *
 * Diferenças importantes em relação a Meta (Instagram/Facebook), TikTok,
 * YouTube e LinkedIn:
 * - Apesar de ser um produto da Meta, o Threads NÃO usa o mesmo App ID/Secret
 *   do Facebook Login: é configurado como um "Threads use case" dentro do
 *   mesmo painel do app da Meta, mas gera um App ID e Secret PRÓPRIOS -
 *   por isso tem sua própria tabela de configuração (ThreadsAppConfig),
 *   igual TikTok/YouTube/LinkedIn.
 * - Host próprio: `graph.threads.net` (não `graph.facebook.com`), e a
 *   autorização acontece em `threads.net/oauth/authorize` (não
 *   `facebook.com`).
 * - Token de acesso: troca em 2 etapas como o TikTok - short-lived (1h) →
 *   long-lived (60 dias) - mas o refresh exige que o token tenha PELO MENOS
 *   24h de idade (e ainda não tenha expirado). Isso é seguro por construção
 *   aqui: a janela de renovação do worker só age uns dias antes do
 *   vencimento (bem mais que 24h de idade nesse ponto).
 * - Publicação: mesmo padrão de contêiner em 2 passos do Instagram (criar +
 *   publicar), pull-by-URL (image_url/video_url, sem upload de arquivo).
 * - Sem agendamento nativo - publicação na hora certa é sempre via worker,
 *   igual Instagram/TikTok/LinkedIn.
 * - Limite: 250 posts / 24h por conta.
 */

const THREADS_OAUTH_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_API_BASE = "https://graph.threads.net/v1.0";

export const THREADS_OAUTH_SCOPES = "threads_basic,threads_content_publish,threads_delete";

export class ThreadsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "ThreadsApiError";
  }
}

/** Monta a URL de consentimento do Threads. */
export function buildThreadsOAuthUrl(state: string, appId: string, redirectUri: string): string {
  const url = new URL(THREADS_OAUTH_AUTH_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", THREADS_OAUTH_SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

/** Troca o "code" do redirect OAuth por um access_token de curta duração (1h). */
export async function exchangeCodeForThreadsToken(
  code: string,
  appId: string,
  appSecret: string,
  redirectUri: string,
): Promise<{ access_token: string; user_id: string }> {
  const res = await fetch(THREADS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new ThreadsApiError(
      json?.error_message ?? json?.error?.message ?? `Erro ao trocar o code por token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as { access_token: string; user_id: string };
}

/** Troca o token de curta duração (1h) por um de longa duração (60 dias). */
export async function exchangeForLongLivedThreadsToken(
  shortLivedToken: string,
  appSecret: string,
): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${THREADS_API_BASE.replace("/v1.0", "")}/access_token`);
  url.searchParams.set("grant_type", "th_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new ThreadsApiError(
      json?.error?.message ?? `Erro ao trocar por token de longa duração (${res.status})`,
      res.status,
      json,
    );
  }
  return json as { access_token: string; expires_in: number };
}

/** Renova um token de longa duração (precisa ter pelo menos 24h de idade e ainda não ter expirado). */
export async function refreshThreadsToken(longLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
  const url = new URL(`${THREADS_API_BASE.replace("/v1.0", "")}/refresh_access_token`);
  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", longLivedToken);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new ThreadsApiError(json?.error?.message ?? `Erro ao renovar o token (${res.status})`, res.status, json);
  }
  return json as { access_token: string; expires_in: number };
}

export type ThreadsProfile = { id: string; username: string };

/** Consulta o perfil do próprio usuário autenticado. */
export async function fetchThreadsProfile(accessToken: string): Promise<ThreadsProfile> {
  const url = new URL(`${THREADS_API_BASE}/me`);
  url.searchParams.set("fields", "id,username");
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new ThreadsApiError(json?.error?.message ?? `Erro ao consultar o perfil (${res.status})`, res.status, json);
  }
  return json as ThreadsProfile;
}

/**
 * Publica um post no Threads: cria o contêiner de mídia, espera o
 * processamento (30s recomendado pela documentação oficial) e publica.
 * Suporta texto puro ou um único anexo (imagem ou vídeo) por pull-by-URL -
 * sem upload de arquivo, igual ao Instagram. Sem suporte a carrossel aqui.
 */
export async function publishThreadsPost(params: {
  accessToken: string;
  threadsUserId: string;
  text: string;
  attachment?: { type: "IMAGE" | "VIDEO"; url: string };
}): Promise<{ postId: string }> {
  const { accessToken, threadsUserId, text, attachment } = params;

  const createUrl = new URL(`${THREADS_API_BASE}/${threadsUserId}/threads`);
  createUrl.searchParams.set("access_token", accessToken);
  if (attachment?.type === "IMAGE") {
    createUrl.searchParams.set("media_type", "IMAGE");
    createUrl.searchParams.set("image_url", attachment.url);
    if (text) createUrl.searchParams.set("text", text);
  } else if (attachment?.type === "VIDEO") {
    createUrl.searchParams.set("media_type", "VIDEO");
    createUrl.searchParams.set("video_url", attachment.url);
    if (text) createUrl.searchParams.set("text", text);
  } else {
    createUrl.searchParams.set("media_type", "TEXT");
    createUrl.searchParams.set("text", text);
  }

  const createRes = await fetch(createUrl, { method: "POST" });
  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || createJson?.error) {
    throw new ThreadsApiError(
      createJson?.error?.message ?? `Erro ao criar o post no Threads (${createRes.status})`,
      createRes.status,
      createJson,
    );
  }
  const creationId = createJson.id as string;

  // A documentação oficial recomenda esperar ~30s pro contêiner terminar de
  // processar antes de publicar (especialmente pra vídeo).
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  const publishUrl = new URL(`${THREADS_API_BASE}/${threadsUserId}/threads_publish`);
  publishUrl.searchParams.set("access_token", accessToken);
  publishUrl.searchParams.set("creation_id", creationId);
  const publishRes = await fetch(publishUrl, { method: "POST" });
  const publishJson = await publishRes.json().catch(() => ({}));
  if (!publishRes.ok || publishJson?.error) {
    throw new ThreadsApiError(
      publishJson?.error?.message ?? `Erro ao publicar no Threads (${publishRes.status})`,
      publishRes.status,
      publishJson,
    );
  }
  return { postId: publishJson.id as string };
}

/**
 * Apaga um post publicado. A documentação oficial confirma que a exclusão
 * existe (com cota própria de 100/dia), mas não detalha o endpoint exato -
 * seguimos o padrão universal da Graph API da Meta (DELETE no mesmo path do
 * objeto).
 */
export async function deleteThreadsPost(postId: string, accessToken: string): Promise<void> {
  const url = new URL(`${THREADS_API_BASE}/${postId}`);
  url.searchParams.set("access_token", accessToken);
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const json = await res.json().catch(() => ({}));
    throw new ThreadsApiError(json?.error?.message ?? `Erro ao apagar o post no Threads (${res.status})`, res.status, json);
  }
}
