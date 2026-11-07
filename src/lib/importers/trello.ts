import type { ImportBoardSummary, ImportedBoard, ImportedColumn } from "./types";
import { ImportSourceError } from "./types";

/**
 * Trello REST API v1. Autentica via par "key" (da aplicação, pública) +
 * "token" (pessoal, gerado pelo próprio usuário) na query string - sem OAuth,
 * sem app review. https://developer.atlassian.com/cloud/trello/rest/
 *
 * O `token` recebido aqui já É o "key:token" colado pelo usuário no passo 1
 * do fluxo de importação (ver ImportarPanel) - Trello exige os dois juntos
 * em toda chamada, então concatenamos na UI pra manter a interface do
 * adapter igual à das outras 3 plataformas (um token só).
 */
const API_BASE = "https://api.trello.com/1";

function splitToken(token: string): { key: string; token: string } {
  const [key, tok] = token.split(":");
  if (!key || !tok) {
    throw new ImportSourceError("Token do Trello inválido - use o formato \"key:token\" gerado na página de autorização.");
  }
  return { key, token: tok };
}

async function trelloFetch(path: string, token: string): Promise<unknown> {
  const { key, token: tok } = splitToken(token);
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_BASE}${path}${sep}key=${key}&token=${tok}`);
  if (!res.ok) {
    throw new ImportSourceError(`Trello retornou ${res.status} ao buscar ${path}`);
  }
  return res.json();
}

export async function listBoards(token: string): Promise<ImportBoardSummary[]> {
  const boards = (await trelloFetch("/members/me/boards?filter=open&fields=id,name", token)) as { id: string; name: string }[];
  return boards.map((b) => ({ id: b.id, name: b.name }));
}

type TrelloList = { id: string; name: string; closed: boolean };
type TrelloAttachment = { url: string; name: string; mimeType: string | null };
type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  idList: string;
  closed: boolean;
  attachments: TrelloAttachment[];
};

export async function fetchBoard(token: string, boardId: string): Promise<ImportedBoard> {
  const [lists, cards] = await Promise.all([
    trelloFetch(`/boards/${boardId}/lists?filter=open&fields=id,name,closed`, token) as Promise<TrelloList[]>,
    trelloFetch(
      `/boards/${boardId}/cards?filter=open&fields=id,name,desc,due,idList,closed&attachments=true&attachment_fields=url,name,mimeType`,
      token,
    ) as Promise<TrelloCard[]>,
  ]);

  const { key, token: tok } = splitToken(token);
  const columns: ImportedColumn[] = lists
    .filter((l) => !l.closed)
    .map((list) => ({
      name: list.name,
      cards: cards
        .filter((c) => c.idList === list.id && !c.closed)
        .map((c) => ({
          title: c.name,
          description: c.desc || undefined,
          dueDate: c.due ?? undefined,
          // Anexos do Trello só liberam o download com key+token na própria
          // URL, senão retorna 401 - diferente das outras 3 plataformas.
          attachments: c.attachments.map((a) => ({
            url: `${a.url}${a.url.includes("?") ? "&" : "?"}key=${key}&token=${tok}`,
            name: a.name,
            mimeType: a.mimeType ?? undefined,
          })),
        })),
    }));

  return { columns };
}
