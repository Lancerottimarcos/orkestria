"use client";

import { useEffect, useRef, useState } from "react";
import { AtSign, Send, Smile, X, Reply } from "lucide-react";

type MentionUser = { id: string; name: string };
type ReplyPreview = { authorName: string; text: string };

const EMOJIS = [
  "😀", "😂", "😍", "😉", "😢", "😮", "🙏", "👍", "👎", "👏",
  "🙌", "🤝", "❤️", "🔥", "🎉", "✅", "❌", "⚠️", "⭐", "💡",
  "📌", "🚀", "👀", "💬", "😅", "🤔", "😴", "🙈", "💪", "🙂",
];

export function MentionComposer({
  mentionableUsers,
  onSend,
  placeholder,
  sending,
  replyingTo,
  onCancelReply,
}: {
  mentionableUsers: MentionUser[];
  onSend: (text: string, mentionedUserId: string | null) => Promise<void> | void;
  placeholder: string;
  sending: boolean;
  replyingTo?: ReplyPreview | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState("");
  const [mention, setMention] = useState<MentionUser | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const suggestions =
    query !== null
      ? mentionableUsers
          .filter((u) => u.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 6)
      : [];

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    if (!emojiOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [emojiOpen]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setText(value);

    const cursor = e.target.selectionStart ?? value.length;
    const uptoCursor = value.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf("@");
    if (atIndex !== -1 && !/\s/.test(uptoCursor.slice(atIndex + 1))) {
      setQuery(uptoCursor.slice(atIndex + 1));
    } else {
      setQuery(null);
    }
  }

  function pickMention(user: MentionUser) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const uptoCursor = text.slice(0, cursor);
    const atIndex = uptoCursor.lastIndexOf("@");
    if (atIndex === -1) return;
    const before = text.slice(0, atIndex);
    const after = text.slice(cursor);
    const nextText = `${before}@${user.name} ${after}`;
    setText(nextText);
    setMention(user);
    setQuery(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pickEmoji(emoji: string) {
    const cursor = inputRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    setText(`${before}${emoji}${after}`);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const pos = cursor + emoji.length;
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const mentionedUserId = mention && trimmed.includes(`@${mention.name}`) ? mention.id : null;
    await onSend(trimmed, mentionedUserId);
    setText("");
    setMention(null);
    setQuery(null);
    onCancelReply?.();
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      {replyingTo && (
        <div className="flex items-center gap-2.5 mb-2 pl-5 pr-2 py-2 rounded-full bg-surface-2">
          <Reply size={14} className="flex-shrink-0 text-muted-2" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink">{replyingTo.authorName}</p>
            <p className="text-xs text-muted-2 truncate">{replyingTo.text}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="flex-shrink-0 p-1.5 rounded-full text-muted-2 hover:text-ink hover:bg-surface-3 transition-colors cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>
      )}
      {suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-60 bg-surface rounded-2xl shadow-2xl shadow-black/20 p-1.5 z-10">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pickMention(u)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-ink rounded-full hover:bg-surface-2 transition-colors cursor-pointer text-left"
            >
              <AtSign size={12} className="text-accent flex-shrink-0" />
              {u.name}
            </button>
          ))}
        </div>
      )}
      {emojiOpen && (
        <div
          ref={emojiRef}
          className="absolute bottom-full right-0 mb-2 w-64 bg-surface rounded-2xl shadow-2xl shadow-black/20 p-2.5 grid grid-cols-8 gap-0.5 z-10"
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => pickEmoji(emoji)}
              className="w-7 h-7 flex items-center justify-center text-base rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 bg-surface-2 rounded-full pl-5 pr-1.5 py-1.5 focus-within:ring-1 focus-within:ring-accent transition-shadow">
        <input
          ref={inputRef}
          value={text}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-muted-2"
        />
        <button
          type="button"
          onClick={() => setEmojiOpen((v) => !v)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-3 transition-colors cursor-pointer"
          title="Emojis"
        >
          <Smile size={17} />
        </button>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          title="Enviar"
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-accent text-black hover:bg-accent-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent cursor-pointer"
        >
          <Send size={15} />
        </button>
      </div>
    </form>
  );
}
