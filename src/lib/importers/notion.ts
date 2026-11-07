import type { ImportBoardSummary, ImportedBoard, ImportedColumn } from "./types";
import { ImportSourceError } from "./types";

/**
 * Notion API, versão 2025-09-03. Autentica com um Internal Integration Token
 * (Configurações > Conectores > Desenvolver ou gerenciar integrações) - o
 * usuário precisa também compartilhar manualmente cada database com a
 * integração (Notion não lista o que não foi compartilhado).
 *
 * Essa versão da API quebrou o modelo antigo de "database": agora toda
 * consulta de linhas é feita contra um "data source" (`/v1/data_sources/{id}`),
 * não mais contra `/v1/databases/{id}` diretamente.
 * https://developers.notion.com/reference/data-source
 */
const API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2025-09-03";

async function notionFetch(path: string, token: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new ImportSourceError(`Notion retornou ${res.status} ao buscar ${path}`);
  }
  return res.json();
}

type NotionRichText = { plain_text: string };
type NotionDataSourceSummary = { id: string; name?: string };

export async function listBoards(token: string): Promise<ImportBoardSummary[]> {
  const { results } = (await notionFetch("/search", token, {
    filter: { value: "data_source", property: "object" },
    page_size: 100,
  })) as { results: NotionDataSourceSummary[] };

  return results.map((r) => ({ id: r.id, name: r.name?.trim() || "Sem nome" }));
}

type NotionFile = { name: string; file?: { url: string }; external?: { url: string } };
type NotionProperty =
  | { type: "title"; title: NotionRichText[] }
  | { type: "select"; select: { name: string } | null }
  | { type: "status"; status: { name: string } | null }
  | { type: "date"; date: { start: string } | null }
  | { type: "files"; files: NotionFile[] }
  | { type: string; [key: string]: unknown };
type NotionPage = { id: string; properties: Record<string, NotionProperty> };

function extractTitle(properties: Record<string, NotionProperty>): string {
  const titleProp = Object.values(properties).find((p): p is Extract<NotionProperty, { type: "title" }> => p.type === "title");
  return titleProp?.title.map((t) => t.plain_text).join("").trim() || "Sem título";
}

function extractGroup(properties: Record<string, NotionProperty>): string {
  const statusProp = Object.values(properties).find((p): p is Extract<NotionProperty, { type: "status" }> => p.type === "status");
  if (statusProp?.status) return statusProp.status.name;
  const selectProp = Object.values(properties).find((p): p is Extract<NotionProperty, { type: "select" }> => p.type === "select");
  if (selectProp?.select) return selectProp.select.name;
  return "Importado";
}

function extractDueDate(properties: Record<string, NotionProperty>): string | undefined {
  const dateProp = Object.values(properties).find((p): p is Extract<NotionProperty, { type: "date" }> => p.type === "date");
  return dateProp?.date?.start ?? undefined;
}

function extractAttachments(properties: Record<string, NotionProperty>) {
  return Object.values(properties)
    .filter((p): p is Extract<NotionProperty, { type: "files" }> => p.type === "files")
    .flatMap((p) => p.files)
    .map((f) => ({ url: f.file?.url ?? f.external?.url ?? "", name: f.name }))
    .filter((f) => f.url);
}

export async function fetchBoard(token: string, dataSourceId: string): Promise<ImportedBoard> {
  const columns = new Map<string, ImportedColumn>();
  let cursor: string | undefined;

  for (;;) {
    const { results, has_more, next_cursor } = (await notionFetch(`/data_sources/${dataSourceId}/query`, token, {
      page_size: 100,
      start_cursor: cursor,
    })) as { results: NotionPage[]; has_more: boolean; next_cursor: string | null };

    for (const page of results) {
      const groupName = extractGroup(page.properties);
      if (!columns.has(groupName)) columns.set(groupName, { name: groupName, cards: [] });
      columns.get(groupName)!.cards.push({
        title: extractTitle(page.properties),
        dueDate: extractDueDate(page.properties),
        // Notion não expõe uma "descrição" genérica via propriedades - o
        // conteúdo do corpo da página exigiria ler os blocks separadamente,
        // fora do escopo desta importação (só dados estruturados + anexos).
        attachments: extractAttachments(page.properties),
      });
    }

    if (!has_more || !next_cursor) break;
    cursor = next_cursor;
  }

  return { columns: Array.from(columns.values()) };
}
