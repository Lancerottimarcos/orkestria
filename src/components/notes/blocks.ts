export type BlockType =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "checklist"
  | "quote"
  | "code"
  | "divider"
  | "callout-info"
  | "callout-warning"
  | "callout-tip";

export type Block = {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
};

export function genBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newBlock(type: BlockType): Block {
  return { id: genBlockId(), type, text: "", checked: false };
}

export function parseBlocks(content: string | null | undefined): Block[] {
  if (!content) return [newBlock("text")];
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((b) => b && typeof b.type === "string")) {
      return parsed.map((b) => ({
        id: typeof b.id === "string" ? b.id : genBlockId(),
        type: b.type as BlockType,
        text: typeof b.text === "string" ? b.text : "",
        checked: typeof b.checked === "boolean" ? b.checked : undefined,
      }));
    }
  } catch {
    // Legacy plain-text content - fall through and wrap it as a single text block.
  }
  return [{ id: genBlockId(), type: "text", text: content }];
}

export function serializeBlocks(blocks: Block[]): string {
  return JSON.stringify(
    blocks.map(({ id, type, text, checked }) => ({
      id,
      type,
      text,
      ...(checked !== undefined ? { checked } : {}),
    })),
  );
}

export function blocksPreviewText(content: string | null | undefined): string {
  return parseBlocks(content)
    .map((b) => b.text)
    .filter(Boolean)
    .join(" ")
    .slice(0, 240);
}
