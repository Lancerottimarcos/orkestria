"use client";

import { useRef } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

/**
 * Descrições de card ficam visíveis pra qualquer membro da equipe que abrir
 * o card. Sem isso, HTML colado por alguém (ex: um <img onerror=...>) seria
 * injetado sem filtro no navegador de quem visualiza depois.
 */
function sanitize(html: string) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ["b", "strong", "i", "em", "ul", "ol", "li", "br", "div"] });
}

function ToolbarButton({
  icon: Icon,
  onClick,
  title,
}: {
  icon: typeof Bold;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-2 hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer"
    >
      <Icon size={14} />
    </button>
  );
}

export function RichTextEditor({
  defaultValue,
  onChange,
  placeholder,
}: {
  defaultValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function exec(command: string) {
    ref.current?.focus();
    document.execCommand(command);
    onChange(sanitize(ref.current?.innerHTML ?? ""));
  }

  return (
    <div className="rounded-xl bg-surface-2 border border-transparent focus-within:border-accent transition-colors overflow-hidden">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-dotted border-border-2">
        <ToolbarButton icon={Bold} onClick={() => exec("bold")} title="Negrito" />
        <ToolbarButton icon={Italic} onClick={() => exec("italic")} title="Itálico" />
        <ToolbarButton icon={List} onClick={() => exec("insertUnorderedList")} title="Lista" />
        <ToolbarButton icon={ListOrdered} onClick={() => exec("insertOrderedList")} title="Lista numerada" />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(sanitize(e.currentTarget.innerHTML))}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
        }}
        data-placeholder={placeholder}
        className="min-h-24 px-5 py-3 text-sm text-ink outline-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-2"
        dangerouslySetInnerHTML={{ __html: sanitize(defaultValue) }}
      />
    </div>
  );
}
