import { Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ReactNode } from "react";

/**
 * Tipo mínimo local pra árvore JSON do TipTap - evita importar @tiptap/react
 * (pacote de editor client-side) dentro de um módulo que roda no servidor
 * pra gerar PDF.
 */
export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string }[];
};

const styles = StyleSheet.create({
  paragraph: { marginBottom: 8 },
  heading: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 6, marginBottom: 6 },
  list: { marginBottom: 8 },
  listItemRow: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 16 },
  listItemBody: { flex: 1 },
});

function markStyle(marks?: { type: string }[]): Style {
  const types = new Set((marks ?? []).map((m) => m.type));
  const bold = types.has("bold");
  const italic = types.has("italic");
  let fontFamily = "Helvetica";
  if (bold && italic) fontFamily = "Helvetica-BoldOblique";
  else if (bold) fontFamily = "Helvetica-Bold";
  else if (italic) fontFamily = "Helvetica-Oblique";
  const style: Style = { fontFamily };
  if (types.has("underline")) style.textDecoration = "underline";
  return style;
}

/**
 * Converte o conteúdo inline (nós de texto + chips de variável) de um
 * parágrafo/título em elementos <Text> aninhados - o padrão suportado pelo
 * @react-pdf/renderer pra texto com formatação mista numa mesma linha.
 */
function renderInline(nodes: TipTapNode[] | undefined, vars: Record<string, string>): ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, i) => {
    if (node.type === "text") {
      return (
        <Text key={i} style={markStyle(node.marks)}>
          {node.text}
        </Text>
      );
    }
    if (node.type === "variableChip") {
      const key = String(node.attrs?.key ?? "");
      const label = String(node.attrs?.label ?? key);
      const value = vars[key] ?? `{{${label}}}`;
      return <Text key={i}>{value}</Text>;
    }
    if (node.type === "hardBreak") {
      return <Text key={i}>{"\n"}</Text>;
    }
    return null;
  });
}

function renderBlock(node: TipTapNode, vars: Record<string, string>, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <Text key={key} style={styles.paragraph}>
          {renderInline(node.content, vars)}
        </Text>
      );
    case "heading":
      return (
        <Text key={key} style={[styles.paragraph, styles.heading]}>
          {renderInline(node.content, vars)}
        </Text>
      );
    case "bulletList":
    case "orderedList":
      return (
        <View key={key} style={styles.list}>
          {(node.content ?? []).map((item, i) => (
            <View key={i} style={styles.listItemRow}>
              <Text style={styles.bullet}>{node.type === "bulletList" ? "•" : `${i + 1}.`}</Text>
              <View style={styles.listItemBody}>
                {(item.content ?? []).map((child, j) => renderBlock(child, vars, j))}
              </View>
            </View>
          ))}
        </View>
      );
    default:
      // Nó desconhecido (ex: blockquote, codeBlock não usados no editor de
      // contrato hoje) - ignora em vez de quebrar a geração inteira.
      return null;
  }
}

/** Converte o documento TipTap inteiro (raiz "doc") numa lista de elementos react-pdf. */
export function renderTipTapDocToPdfNodes(doc: TipTapNode, vars: Record<string, string>): ReactNode[] {
  return (doc.content ?? []).map((node, i) => renderBlock(node, vars, i));
}
