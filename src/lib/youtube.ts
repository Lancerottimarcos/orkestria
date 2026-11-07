/**
 * Cliente da YouTube Data API v3 (via OAuth 2.0 do Google) para conectar o
 * canal de cada cliente da agência e agendar/publicar vídeos.
 *
 * Baseado na documentação oficial (consultada em agosto/2026):
 * - OAuth 2.0 para apps web: https://developers.google.com/identity/protocols/oauth2/web-server
 * - Escopos: https://developers.google.com/identity/protocols/oauth2/scopes#youtube
 * - videos.insert: https://developers.google.com/youtube/v3/docs/videos/insert
 * - Upload resumível: https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 * - videos.update: https://developers.google.com/youtube/v3/docs/videos/update
 * - videos.delete: https://developers.google.com/youtube/v3/docs/videos/delete
 * - channels.list: https://developers.google.com/youtube/v3/docs/channels/list
 * - Cota: https://developers.google.com/youtube/v3/determine_quota_cost
 *
 * Este arquivo é só o cliente puro da API - não sabe de onde vêm o Client
 * ID/Secret (ver src/lib/youtubeConfig.ts).
 *
 * Diferenças importantes em relação à Meta/TikTok:
 * - O YouTube agenda nativamente (igual o Facebook): manda o vídeo já com
 *   privacyStatus "private" + publishAt no futuro, e o próprio YouTube
 *   libera como público na hora certa - não precisa de worker vigiando.
 * - Diferente de Meta/TikTok (que usam PULL_FROM_URL, o servidor deles baixa
 *   da nossa URL), o YouTube exige que o ARQUIVO seja enviado de verdade pro
 *   Google (upload resumível) - então este código baixa o vídeo da nossa URL
 *   e reenvia os bytes pro Google numa única chamada (sem quebrar em chunks;
 *   aceitável pro tamanho de vídeo de post de rede social, mas não ideal
 *   pra arquivos enormes/conexões instáveis).
 * - Escopo usado: youtube.force-ssl (não youtube.upload) - o upload sozinho
 *   aceitaria o escopo mais restrito, mas atualizar o status pra "público"
 *   (Publicar agora) e apagar o vídeo (Cancelar agendamento) exigem um dos
 *   escopos mais amplos (youtube, youtube.force-ssl ou youtubepartner).
 *   force-ssl é o menos amplo dos três que ainda cobre as 3 operações.
 * - O token de acesso do Google dura só ~1h (bem mais curto que Meta/TikTok),
 *   por isso o worker precisa renovar com mais frequência.
 */

const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

export const YOUTUBE_OAUTH_SCOPES = "https://www.googleapis.com/auth/youtube.force-ssl";

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

/** Monta a URL de consentimento do Google (access_type=offline + prompt=consent garantem refresh_token mesmo em reconexão). */
export function buildGoogleOAuthUrl(state: string, clientId: string, redirectUri: string): string {
  const url = new URL(GOOGLE_OAUTH_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_OAUTH_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export type GoogleTokenResult = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type: string;
  scope: string;
};

/** Troca o "code" do redirect OAuth pelo access_token/refresh_token. */
export async function exchangeCodeForGoogleToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<GoogleTokenResult> {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new YouTubeApiError(
      json?.error_description ?? json?.error ?? `Erro ao trocar o code por token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as GoogleTokenResult;
}

/**
 * Renova o access_token usando o refresh_token. O Google não rotaciona o
 * refresh_token a cada uso (ao contrário do TikTok) - continua valendo o
 * mesmo até ser revogado pelo usuário ou expirar por inatividade.
 */
export async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<Omit<GoogleTokenResult, "refresh_token">> {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new YouTubeApiError(
      json?.error_description ?? json?.error ?? `Erro ao renovar o token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as Omit<GoogleTokenResult, "refresh_token">;
}

export type YouTubeChannelInfo = {
  channelId: string;
  title: string;
  thumbnailUrl: string | null;
};

/** Consulta o canal do próprio usuário autenticado (mine=true). */
export async function fetchYouTubeChannelInfo(accessToken: string): Promise<YouTubeChannelInfo> {
  const url = new URL(`${YOUTUBE_API_BASE}/channels`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new YouTubeApiError(json?.error?.message ?? `Erro ao consultar o canal (${res.status})`, res.status, json);
  }
  const channel = json.items?.[0];
  if (!channel) throw new YouTubeApiError("Nenhum canal do YouTube encontrado para essa conta Google", 404, json);
  return {
    channelId: channel.id,
    title: channel.snippet?.title ?? "Canal do YouTube",
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? null,
  };
}

/**
 * Faz upload de um vídeo via protocolo resumível (numa única chamada, sem
 * quebrar em chunks) e já agenda a publicação: manda privacyStatus "private"
 * + publishAt no futuro, e o YouTube libera como público sozinho na hora
 * marcada - sem precisar de nenhuma chamada extra depois.
 */
export async function uploadYouTubeVideo(params: {
  accessToken: string;
  videoUrl: string;
  title: string;
  description?: string;
  publishAt: string;
  categoryId?: string;
}): Promise<{ videoId: string }> {
  const { accessToken, videoUrl, title, description, publishAt, categoryId } = params;

  const fileRes = await fetch(videoUrl);
  if (!fileRes.ok || !fileRes.body) {
    throw new YouTubeApiError(`Não foi possível baixar o vídeo anexado (${fileRes.status})`, fileRes.status, null);
  }
  const contentType = fileRes.headers.get("content-type") || "video/*";
  const bytes = await fileRes.arrayBuffer();

  const initRes = await fetch(`${YOUTUBE_UPLOAD_BASE}/videos?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(bytes.byteLength),
      "X-Upload-Content-Type": contentType,
    },
    body: JSON.stringify({
      snippet: {
        title: title.slice(0, 100),
        description: description ?? "",
        categoryId: categoryId ?? "22",
      },
      status: {
        privacyStatus: "private",
        publishAt,
        selfDeclaredMadeForKids: false,
      },
    }),
  });
  if (!initRes.ok) {
    const errJson = await initRes.json().catch(() => ({}));
    throw new YouTubeApiError(
      errJson?.error?.message ?? `Erro ao iniciar upload no YouTube (${initRes.status})`,
      initRes.status,
      errJson,
    );
  }
  const uploadUrl = initRes.headers.get("location");
  if (!uploadUrl) throw new YouTubeApiError("YouTube não retornou a URL de upload", 500, null);

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
  });
  const uploadJson = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    throw new YouTubeApiError(
      uploadJson?.error?.message ?? `Erro ao enviar o vídeo pro YouTube (${uploadRes.status})`,
      uploadRes.status,
      uploadJson,
    );
  }
  return { videoId: uploadJson.id as string };
}

/**
 * Publica agora um vídeo que já estava agendado (privado + publishAt) - só
 * troca o status pra "public"; como o campo publishAt não é reenviado, o
 * YouTube já remove o agendamento sozinho (regra da própria API: campo
 * omitido dentro de uma part enviada é apagado do recurso).
 */
export async function publishYouTubeVideoNow(videoId: string, accessToken: string): Promise<void> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("part", "status");
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ id: videoId, status: { privacyStatus: "public" } }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new YouTubeApiError(json?.error?.message ?? `Erro ao publicar agora no YouTube (${res.status})`, res.status, json);
  }
}

/** Cancela um vídeo já enviado (agendado, ainda privado) - apaga de vez do canal. */
export async function deleteYouTubeVideo(videoId: string, accessToken: string): Promise<void> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("id", videoId);
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const json = await res.json().catch(() => ({}));
    throw new YouTubeApiError(json?.error?.message ?? `Erro ao cancelar o vídeo no YouTube (${res.status})`, res.status, json);
  }
}
