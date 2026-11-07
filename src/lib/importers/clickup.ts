import type { ImportBoardSummary, ImportedBoard, ImportedColumn } from "./types";
import { ImportSourceError } from "./types";

/**
 * ClickUp API v2. Autentica com o Personal API Token (pk_...) gerado em
 * Configurações > Apps do próprio usuário - nunca expira, sem OAuth.
 * https://developer.clickup.com/reference
 *
 * "Board" aqui = uma List do ClickUp (nível mais baixo da hierarquia
 * Workspace > Space > Folder > List); cada task list vira um board no Kanban.
 */
const API_BASE = "https://api.clickup.com/api/v2";

async function clickupFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: token } });
  if (!res.ok) {
    throw new ImportSourceError(`ClickUp retornou ${res.status} ao buscar ${path}`);
  }
  return res.json();
}

type ClickUpList = { id: string; name: string };
type ClickUpFolder = { lists: ClickUpList[] };
type ClickUpSpace = { id: string; name: string };
type ClickUpTeam = { id: string; name: string };

export async function listBoards(token: string): Promise<ImportBoardSummary[]> {
  const { teams } = (await clickupFetch("/team", token)) as { teams: ClickUpTeam[] };
  const boards: ImportBoardSummary[] = [];

  for (const team of teams) {
    const { spaces } = (await clickupFetch(`/team/${team.id}/space?archived=false`, token)) as { spaces: ClickUpSpace[] };
    for (const space of spaces) {
      const [{ folders }, { lists: folderlessLists }] = await Promise.all([
        clickupFetch(`/space/${space.id}/folder?archived=false`, token) as Promise<{ folders: ClickUpFolder[] }>,
        clickupFetch(`/space/${space.id}/list?archived=false`, token) as Promise<{ lists: ClickUpList[] }>,
      ]);
      for (const folder of folders) {
        for (const list of folder.lists) boards.push({ id: list.id, name: `${space.name} / ${list.name}` });
      }
      for (const list of folderlessLists) boards.push({ id: list.id, name: `${space.name} / ${list.name}` });
    }
  }

  return boards;
}

type ClickUpAttachment = { url: string; title: string; mimetype: string | null };
type ClickUpStatus = { status: string };
type ClickUpTask = {
  id: string;
  name: string;
  text_content: string | null;
  due_date: string | null;
  status: ClickUpStatus;
  attachments: ClickUpAttachment[];
};

export async function fetchBoard(token: string, boardId: string): Promise<ImportedBoard> {
  const columns = new Map<string, ImportedColumn>();
  let page = 0;

  // ClickUp pagina em blocos de 100 tasks; segue lendo até a última página.
  for (;;) {
    const { tasks, last_page } = (await clickupFetch(
      `/list/${boardId}/task?page=${page}&include_closed=true&attachments=true`,
      token,
    )) as { tasks: ClickUpTask[]; last_page: boolean };

    for (const task of tasks) {
      const columnName = task.status.status;
      if (!columns.has(columnName)) columns.set(columnName, { name: columnName, cards: [] });
      columns.get(columnName)!.cards.push({
        title: task.name,
        description: task.text_content ?? undefined,
        dueDate: task.due_date ? new Date(Number(task.due_date)).toISOString() : undefined,
        attachments: task.attachments.map((a) => ({
          url: a.url,
          name: a.title,
          mimeType: a.mimetype ?? undefined,
        })),
      });
    }

    if (last_page) break;
    page += 1;
  }

  return { columns: Array.from(columns.values()) };
}
