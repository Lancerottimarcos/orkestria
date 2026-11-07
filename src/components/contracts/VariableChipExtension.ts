import { Node, mergeAttributes } from "@tiptap/core";

export interface VariableChipOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    variableChip: {
      insertVariable: (attrs: { key: string; label: string }) => ReturnType;
    };
  }
}

/**
 * Token de variável ({{contratante.razao_social}}) como nó atômico e
 * não-editável - inserido só pela barra lateral, não pode ser corrompido por
 * digitação solta no meio do chip. attrs.key é o identificador usado na
 * resolução (src/lib/contracts/variables.ts); attrs.label é só o texto
 * amigável mostrado no editor.
 */
export const VariableChip = Node.create<VariableChipOptions>({
  name: "variableChip",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      key: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-variable-chip]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-variable-chip": node.attrs.key,
        class: "variable-chip",
      }),
      `{{${node.attrs.label}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
