/**
 * Cliente da API do LinkedIn (Community Management API / Posts API) para
 * conectar a Company Page de cada cliente da agência e publicar/agendar
 * conteúdo.
 *
 * Baseado na documentação oficial (consultada em agosto/2026):
 * - OAuth 2.0 (3-legged): https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
 * - Organization Access Control: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-access-control-by-role
 * - Organization Lookup: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api
 * - Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 * - Images API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/images-api
 * - Videos API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api
 *
 * Diferenças importantes em relação a Meta/TikTok/YouTube:
 * - O LinkedIn NÃO tem agendamento nativo (lifecycleState só aceita DRAFT/
 *   PUBLISHED/PUBLISH_REQUESTED/PUBLISH_FAILED, sem estado "agendado" nem
 *   campo de data futura) - quem publica na hora certa é o worker, igual
 *   Instagram/TikTok.
 * - A conta conectada é a Company Page do cliente (não o perfil pessoal de
 *   quem faz login) - por isso o escopo pedido é o de organização
 *   (w_organization_social + rw_organization_admin), não w_member_social.
 *   Publicar como Company Page exige que o app tenha sido aprovado pro
 *   produto "Community Management API" da LinkedIn - aprovação manual, não
 *   self-serve (mesmo padrão do TikTok: o código já fica pronto, só falta a
 *   auditoria aprovar pra funcionar de verdade em produção).
 * - O access_token dura 60 dias fixos pra todo app, sem exceção. Refresh
 *   token programático só existe pra parceiros aprovados no "Programmatic
 *   Refresh Tokens" - sem essa aprovação, não tem refresh_token nenhum: ao
 *   expirar, a única forma de renovar é a pessoa logar de novo (o worker não
 *   consegue fazer isso sozinho, só marca a conta como EXPIRED e a agência
 *   precisa reconectar manualmente).
 * - Upload de imagem (Images API): registro + 1 PUT síncrono com o token de
 *   acesso no header.
 * - Upload de vídeo (Videos API): registro + PUT de cada parte de tamanho
 *   fixo definido pela própria API (sem token de acesso no header dessas
 *   partes) + finalize com os ETags de cada parte, na ordem - sempre em
 *   partes, não importa o tamanho do arquivo.
 * - Posts orgânicos não suportam carrossel (múltiplas imagens) - só o
 *   primeiro anexo da demanda é usado, igual já acontece com o Facebook.
 */

const LINKEDIN_OAUTH_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_OAUTH_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_BASE = "https://api.linkedin.com/rest";
// Formato YYYYMM exigido no header Linkedin-Version - a LinkedIn versiona por
// mês, válida ~12 meses. Dá pra atualizar via env var (sem novo deploy)
// quando o valor abaixo estiver perto de vencer; esse é só o fallback.
const LINKEDIN_API_VERSION = process.env.LINKEDIN_API_VERSION || "202608";

export const LINKEDIN_OAUTH_SCOPES = "w_organization_social rw_organization_admin";

export class LinkedInApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "LinkedInApiError";
  }
}

function linkedInHeaders(accessToken: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": LINKEDIN_API_VERSION,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Monta a URL de consentimento do LinkedIn (3-legged OAuth). */
export function buildLinkedInOAuthUrl(state: string, clientId: string, redirectUri: string): string {
  const url = new URL(LINKEDIN_OAUTH_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", LINKEDIN_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export type LinkedInTokenResult = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope: string;
};

/** Troca o "code" do redirect OAuth pelo access_token (60 dias fixos, sem exceção). */
export async function exchangeCodeForLinkedInToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): Promise<LinkedInTokenResult> {
  const res = await fetch(LINKEDIN_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    throw new LinkedInApiError(
      json?.error_description ?? json?.error ?? `Erro ao trocar o code por token (${res.status})`,
      res.status,
      json,
    );
  }
  return json as LinkedInTokenResult;
}

export type LinkedInOrganization = { organizationId: string; urn: string; name: string };

/**
 * Lista as Company Pages que o membro autenticado administra (role
 * ADMINISTRATOR aprovada). Se a pessoa administra mais de uma, quem chama
 * decide qual conectar nesse cliente (mesmo padrão do seletor de Páginas do
 * Facebook).
 */
export async function fetchAdministeredOrganizations(accessToken: string): Promise<LinkedInOrganization[]> {
  const aclsUrl = new URL(`${LINKEDIN_API_BASE}/organizationAcls`);
  aclsUrl.searchParams.set("q", "roleAssignee");
  aclsUrl.searchParams.set("role", "ADMINISTRATOR");
  aclsUrl.searchParams.set("state", "APPROVED");
  const aclsRes = await fetch(aclsUrl, { headers: linkedInHeaders(accessToken) });
  const aclsJson = await aclsRes.json().catch(() => ({}));
  if (!aclsRes.ok) {
    throw new LinkedInApiError(
      aclsJson?.message ?? `Erro ao listar as páginas administradas (${aclsRes.status})`,
      aclsRes.status,
      aclsJson,
    );
  }
  const elements = (aclsJson.elements ?? []) as Array<{ organizationTarget?: string; organization?: string }>;
  const ids = elements
    .map((e) => (e.organizationTarget ?? e.organization ?? "").split(":").pop())
    .filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  // Formato List(...) do Rest.li 2.0 - mantido literal (sem URLSearchParams,
  // que codificaria os parênteses/vírgulas e quebraria o finder).
  const namesRes = await fetch(`${LINKEDIN_API_BASE}/organizations?ids=List(${ids.join(",")})`, {
    headers: linkedInHeaders(accessToken),
  });
  const namesJson = await namesRes.json().catch(() => ({}));
  if (!namesRes.ok) {
    throw new LinkedInApiError(
      namesJson?.message ?? `Erro ao consultar os nomes das páginas (${namesRes.status})`,
      namesRes.status,
      namesJson,
    );
  }
  const results = (namesJson.results ?? {}) as Record<string, { localizedName?: string }>;
  return ids.map((id) => ({
    organizationId: id,
    urn: `urn:li:organization:${id}`,
    name: results[id]?.localizedName ?? `Página ${id}`,
  }));
}

/** Registra e envia uma imagem (Images API), retornando a Image URN pra usar no post. */
async function uploadLinkedInImage(params: {
  accessToken: string;
  organizationUrn: string;
  imageUrl: string;
}): Promise<string> {
  const { accessToken, organizationUrn, imageUrl } = params;

  const initRes = await fetch(`${LINKEDIN_API_BASE}/images?action=initializeUpload`, {
    method: "POST",
    headers: linkedInHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: organizationUrn } }),
  });
  const initJson = await initRes.json().catch(() => ({}));
  if (!initRes.ok) {
    throw new LinkedInApiError(
      initJson?.message ?? `Erro ao iniciar upload de imagem no LinkedIn (${initRes.status})`,
      initRes.status,
      initJson,
    );
  }
  const { uploadUrl, image } = initJson.value as { uploadUrl: string; image: string };

  const fileRes = await fetch(imageUrl);
  if (!fileRes.ok) {
    throw new LinkedInApiError(`Não foi possível baixar a imagem anexada (${fileRes.status})`, fileRes.status, null);
  }
  const bytes = await fileRes.arrayBuffer();
  const contentType = fileRes.headers.get("content-type") || "image/jpeg";

  // Diferente do vídeo, o upload de imagem exige o token de acesso no header.
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType },
    body: bytes,
  });
  if (!uploadRes.ok) {
    throw new LinkedInApiError(`Erro ao enviar a imagem pro LinkedIn (${uploadRes.status})`, uploadRes.status, null);
  }
  return image;
}

/** Registra e envia um vídeo em partes (Videos API), retornando a Video URN pra usar no post. */
async function uploadLinkedInVideo(params: {
  accessToken: string;
  organizationUrn: string;
  videoUrl: string;
}): Promise<string> {
  const { accessToken, organizationUrn, videoUrl } = params;

  const fileRes = await fetch(videoUrl);
  if (!fileRes.ok) {
    throw new LinkedInApiError(`Não foi possível baixar o vídeo anexado (${fileRes.status})`, fileRes.status, null);
  }
  const bytes = new Uint8Array(await fileRes.arrayBuffer());

  const initRes = await fetch(`${LINKEDIN_API_BASE}/videos?action=initializeUpload`, {
    method: "POST",
    headers: linkedInHeaders(accessToken),
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: organizationUrn,
        fileSizeBytes: bytes.byteLength,
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  });
  const initJson = await initRes.json().catch(() => ({}));
  if (!initRes.ok) {
    throw new LinkedInApiError(
      initJson?.message ?? `Erro ao iniciar upload de vídeo no LinkedIn (${initRes.status})`,
      initRes.status,
      initJson,
    );
  }
  const { video, uploadInstructions, uploadToken } = initJson.value as {
    video: string;
    uploadToken: string;
    uploadInstructions: { uploadUrl: string; firstByte: number; lastByte: number }[];
  };

  const uploadedPartIds: string[] = [];
  for (const part of uploadInstructions) {
    const chunk = bytes.slice(part.firstByte, part.lastByte + 1);
    // O upload de vídeo (diferente do de imagem) NÃO leva token de acesso.
    const partRes = await fetch(part.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: chunk,
    });
    if (!partRes.ok) {
      throw new LinkedInApiError(`Erro ao enviar parte do vídeo pro LinkedIn (${partRes.status})`, partRes.status, null);
    }
    const etag = partRes.headers.get("etag");
    if (!etag) throw new LinkedInApiError("LinkedIn não retornou o ETag da parte enviada", 500, null);
    uploadedPartIds.push(etag);
  }

  const finalizeRes = await fetch(`${LINKEDIN_API_BASE}/videos?action=finalizeUpload`, {
    method: "POST",
    headers: linkedInHeaders(accessToken),
    body: JSON.stringify({ finalizeUploadRequest: { video, uploadToken, uploadedPartIds } }),
  });
  if (!finalizeRes.ok) {
    const json = await finalizeRes.json().catch(() => ({}));
    throw new LinkedInApiError(
      json?.message ?? `Erro ao finalizar upload de vídeo no LinkedIn (${finalizeRes.status})`,
      finalizeRes.status,
      json,
    );
  }
  return video;
}

/** Cria o post em si (Posts API). Retorna a Post URN (via header x-restli-id). */
async function createLinkedInPost(params: {
  accessToken: string;
  organizationUrn: string;
  commentary: string;
  mediaUrn?: string;
}): Promise<string> {
  const { accessToken, organizationUrn, commentary, mediaUrn } = params;
  const body: Record<string, unknown> = {
    author: organizationUrn,
    commentary,
    visibility: "PUBLIC",
    distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };
  if (mediaUrn) {
    body.content = { media: { id: mediaUrn } };
  }

  const res = await fetch(`${LINKEDIN_API_BASE}/posts`, {
    method: "POST",
    headers: linkedInHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new LinkedInApiError(json?.message ?? `Erro ao publicar no LinkedIn (${res.status})`, res.status, json);
  }
  const postUrn = res.headers.get("x-restli-id");
  if (!postUrn) throw new LinkedInApiError("LinkedIn não retornou o ID da publicação", 500, null);
  return postUrn;
}

/**
 * Publica um post na Company Page conectada - sobe a mídia (se houver) e
 * cria o post em seguida. Só o primeiro anexo é usado (sem carrossel, que
 * não é suportado em posts orgânicos).
 */
export async function publishLinkedInPost(params: {
  accessToken: string;
  organizationUrn: string;
  commentary: string;
  attachment?: { type: "IMAGE" | "VIDEO"; url: string };
}): Promise<{ postUrn: string }> {
  const { accessToken, organizationUrn, commentary, attachment } = params;
  let mediaUrn: string | undefined;
  if (attachment?.type === "IMAGE") {
    mediaUrn = await uploadLinkedInImage({ accessToken, organizationUrn, imageUrl: attachment.url });
  } else if (attachment?.type === "VIDEO") {
    mediaUrn = await uploadLinkedInVideo({ accessToken, organizationUrn, videoUrl: attachment.url });
  }
  const postUrn = await createLinkedInPost({ accessToken, organizationUrn, commentary, mediaUrn });
  return { postUrn };
}

/** Cancela/apaga uma publicação (idempotente - 404 já é sucesso, post já não existe mais). */
export async function deleteLinkedInPost(postUrn: string, accessToken: string): Promise<void> {
  const res = await fetch(`${LINKEDIN_API_BASE}/posts/${encodeURIComponent(postUrn)}`, {
    method: "DELETE",
    headers: linkedInHeaders(accessToken, { "X-RestLi-Method": "DELETE" }),
  });
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const json = await res.json().catch(() => ({}));
    throw new LinkedInApiError(
      json?.message ?? `Erro ao apagar a publicação no LinkedIn (${res.status})`,
      res.status,
      json,
    );
  }
}
