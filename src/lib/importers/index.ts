import * as trello from "./trello";
import * as clickup from "./clickup";
import * as notion from "./notion";
import * as asana from "./asana";
import type { ImportBoardSummary, ImportedBoard } from "./types";

export type { ImportBoardSummary, ImportedBoard, ImportedCard, ImportedColumn, ImportedAttachment } from "./types";
export { ImportSourceError } from "./types";

export type ImportPlatformKey = "TRELLO" | "CLICKUP" | "NOTION" | "ASANA";

type Adapter = {
  listBoards(token: string): Promise<ImportBoardSummary[]>;
  fetchBoard(token: string, boardId: string): Promise<ImportedBoard>;
};

const ADAPTERS: Record<ImportPlatformKey, Adapter> = { TRELLO: trello, CLICKUP: clickup, NOTION: notion, ASANA: asana };

export function getImporter(platform: ImportPlatformKey): Adapter {
  return ADAPTERS[platform];
}

const PLATFORM_SLUGS: Record<string, ImportPlatformKey> = {
  trello: "TRELLO",
  clickup: "CLICKUP",
  notion: "NOTION",
  asana: "ASANA",
};

/** Converte o slug da URL (`/api/importar/trello/...`) na chave do enum. */
export function parsePlatformSlug(slug: string): ImportPlatformKey | null {
  return PLATFORM_SLUGS[slug] ?? null;
}
