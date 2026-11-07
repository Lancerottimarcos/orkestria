import type { ReactNode } from "react";
import type { TipTapNode } from "./pdfNodes";
import { cn } from "@/lib/cn";

/** Mesma travessia de pdfNodes.tsx, mas devolvendo JSX simples pra prévia na tela (não react-pdf). */
export function renderInline(nodes: TipTapNode[] | undefined, vars: Record<string, string>): ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, i) => {
    if (node.type === "text") {
      const types = new Set((node.marks ?? []).map((m) => m.type));
      return (
        <span
          key={i}
          className={cn(
            types.has("bold") && "font-bold",
            types.has("italic") && "italic",
            types.has("underline") && "underline",
          )}
        >
          {node.text}
        </span>
      );
    }
    if (node.type === "variableChip") {
      const key = String(node.attrs?.key ?? "");
      const label = String(node.attrs?.label ?? key);
      const value = vars[key] ?? `{{${label}}}`;
      return (
        <span key={i} className="text-accent font-medium">
          {value}
        </span>
      );
    }
    if (node.type === "hardBreak") return <br key={i} />;
    return null;
  });
}

function renderBlock(node: TipTapNode, vars: Record<string, string>, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="mb-2">
          {renderInline(node.content, vars)}
        </p>
      );
    case "heading":
      return (
        <h2 key={key} className="text-base font-bold mt-3 mb-2">
          {renderInline(node.content, vars)}
        </h2>
      );
    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-5 mb-2">
          {(node.content ?? []).map((item, i) => (
            <li key={i}>{(item.content ?? []).map((child, j) => renderBlock(child, vars, j))}</li>
          ))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="list-decimal pl-5 mb-2">
          {(node.content ?? []).map((item, i) => (
            <li key={i}>{(item.content ?? []).map((child, j) => renderBlock(child, vars, j))}</li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

/** Prévia somente-leitura na tela do mesmo documento TipTap usado no PDF - variáveis já substituídas. */
export function ContractHtmlPreview({ doc, vars, size = "sm" }: { doc: TipTapNode; vars: Record<string, string>; size?: "sm" | "document" }) {
  return (
    <div className={size === "document" ? "text-[15px] text-ink leading-[1.9]" : "text-sm text-ink leading-relaxed"}>
      {(doc.content ?? []).map((node, i) => renderBlock(node, vars, i))}
    </div>
  );
}
