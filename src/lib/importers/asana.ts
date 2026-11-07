import type { ImportBoardSummary, ImportedBoard, ImportedColumn } from "./types";
import { ImportSourceError } from "./types";

/**
 * Asana API. Autentica com um Personal Access Token (Configurações do perfil
 * > Apps > Gerenciar Tokens de Acesso Pessoal) - método de auth mais simples
 * recomendado pela própria Asana pra scripts/integrações pessoais.
 * https://developers.asana.com/reference/rest-api-reference
 */
const API_BASE = "https://app.asana.com/api/1.0";

async function asanaFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new ImportSourceError(`Asana retornou ${res.status} ao buscar ${path}`);
  }
  const json = await res.json();
  return json.data;
}

type AsanaWorkspace = { gid: string; name: string };
type AsanaProject = { gid: string; name: string };

export async function listBoards(token: string): Promise<ImportBoardSummary[]> {
  const workspaces = (await asanaFetch("/workspaces", token)) as AsanaWorkspace[];
  const boards: ImportBoardSummary[] = [];

  for (const ws of workspaces) {
    const projects = (await asanaFetch(
      `/projects?workspace=${ws.gid}&archived=false&opt_fields=name`,
      token,
    )) as AsanaProject[];
    for (const p of projects) boards.push({ id: p.gid, name: `${ws.name} / ${p.name}` });
  }

  return boards;
}

type AsanaSection = { gid: string; name: string };
type AsanaAttachment = { gid: string; name: string; download_url: string | null };
type AsanaTask = {
  gid: string;
  name: string;
  notes: string;
  due_on: string | null;
  memberships: { section: { gid: string } | null }[];
};

export async function fetchBoard(token: string, projectId: string): Promise<ImportedBoard> {
  const sections = (await asanaFetch(`/projects/${projectId}/sections?opt_fields=name`, token)) as AsanaSection[];
  const columns = new Map<string, ImportedColumn>(sections.map((s) => [s.gid, { name: s.name, cards: [] }]));
  // Toda task de um projeto Asana pertence a alguma section - cria um balde
  // extra só como rede de segurança pra tasks sem seção (não deveria acontecer).
  const fallback: ImportedColumn = { name: "Sem seção", cards: [] };

  const tasks = (await asanaFetch(
    `/projects/${projectId}/tasks?opt_fields=name,notes,due_on,memberships.section&completed_since=1970-01-01`,
    token,
  )) as AsanaTask[];

  for (const task of tasks) {
    const attachments = (await asanaFetch(
      `/attachments?parent=${task.gid}&opt_fields=name,download_url`,
      token,
    )) as AsanaAttachment[];

    const sectionGid = task.memberships.find((m) => m.section)?.section?.gid;
    const column = (sectionGid && columns.get(sectionGid)) || fallback;
    column.cards.push({
      title: task.name,
      description: task.notes || undefined,
      dueDate: task.due_on ?? undefined,
      attachments: attachments
        .filter((a) => a.download_url)
        .map((a) => ({ url: a.download_url!, name: a.name })),
    });
  }

  const result = Array.from(columns.values());
  if (fallback.cards.length > 0) result.push(fallback);
  return { columns: result };
}
