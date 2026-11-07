/**
 * Formato normalizado que todo adapter de importação (Trello/ClickUp/Notion/
 * Asana) devolve, pra manter o resto do pipeline (criação de board/coluna/
 * card no Kanban) agnóstico de plataforma de origem.
 */
export type ImportedAttachment = { url: string; name: string; mimeType?: string };
export type ImportedCard = { title: string; description?: string; dueDate?: string; attachments: ImportedAttachment[] };
export type ImportedColumn = { name: string; cards: ImportedCard[] };
export type ImportedBoard = { columns: ImportedColumn[] };
export type ImportBoardSummary = { id: string; name: string };

export class ImportSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportSourceError";
  }
}
