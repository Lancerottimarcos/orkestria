"use client";

import { forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2 } from "lucide-react";
import { VariableChip } from "./VariableChipExtension";
import { cn } from "@/lib/cn";

function ToolbarButton({
  icon: Icon,
  onClick,
  active,
  title,
}: {
  icon: typeof Bold;
  onClick: () => void;
  active?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer",
        active ? "text-accent bg-surface-3" : "text-muted-2 hover:text-accent hover:bg-surface-3",
      )}
    >
      <Icon size={14} />
    </button>
  );
}

export type ContractEditorHandle = {
  insertVariable: (key: string, label: string) => void;
};

export const ContractEditor = forwardRef<
  ContractEditorHandle,
  { defaultContent: JSONContent | null; onChange: (json: JSONContent) => void }
>(function ContractEditor({ defaultContent, onChange }, ref) {
  const editor = useEditor({
    extensions: [StarterKit, VariableChip],
    content: defaultContent ?? "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  useImperativeHandle(
    ref,
    () => ({
      insertVariable(key: string, label: string) {
        editor?.chain().focus().insertVariable({ key, label }).run();
      },
    }),
    [editor],
  );

  if (!editor) return null;

  return (
    <div className="rounded-xl bg-surface-2 border border-transparent focus-within:border-accent transition-colors overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dotted border-border-2 flex-wrap">
        <ToolbarButton
          icon={Bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrito"
        />
        <ToolbarButton
          icon={Italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Itálico"
        />
        <ToolbarButton
          icon={UnderlineIcon}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Sublinhado"
        />
        <ToolbarButton
          icon={Heading2}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Título"
        />
        <ToolbarButton
          icon={List}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista"
        />
        <ToolbarButton
          icon={ListOrdered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerada"
        />
      </div>
      <EditorContent
        editor={editor}
        className="min-h-[420px] px-6 py-5 text-sm text-ink leading-relaxed outline-none [&_.ProseMirror]:outline-none [&_.variable-chip]:bg-accent/15 [&_.variable-chip]:text-accent [&_.variable-chip]:rounded-full [&_.variable-chip]:px-2 [&_.variable-chip]:py-0.5 [&_.variable-chip]:text-xs [&_.variable-chip]:font-semibold [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
    </div>
  );
});
