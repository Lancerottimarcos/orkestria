"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { IconChip } from "@/components/ui/IconChip";
import { MentionComposer } from "./MentionComposer";
import { cn } from "@/lib/cn";

type Message = {
  id: string;
  text: string;
  createdAt: string;
  authorUser: { id: string; name: string } | null;
  authorClient: { id: string; name: string } | null;
  mentionedUser: { id: string; name: string } | null;
};

type MentionUser = { id: string; name: string };

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function PortalChatWidget({ mentionableUsers }: { mentionableUsers: MentionUser[] }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/portal/chat/messages");
    if (res.ok) setMessages(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend(text: string, mentionedUserId: string | null) {
    setSending(true);
    try {
      const res = await fetch("/api/portal/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mentionedUserId: mentionedUserId || "" }),
      });
      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <Card padding="none" className="flex flex-col overflow-hidden h-[32rem]">
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <IconChip tone="accent" size="sm">
            <MessageCircle size={15} />
          </IconChip>
          <h2 className="text-base font-semibold text-ink">Fale com a equipe</h2>
        </div>
        <p className="text-[13px] text-muted mt-2">
          Peça alterações, tire dúvidas ou avise sobre uma demanda. Use @ para marcar a pessoa responsável.
        </p>
      </div>
      <DottedDivider className="mx-5" />

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-4">
        {loading && <p className="text-xs text-muted-2 text-center my-auto">Carregando mensagens...</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-2 text-center my-auto">Nenhuma mensagem ainda. Envie a primeira.</p>
        )}
        {messages.map((m) => {
          const isMe = !!m.authorClient;
          const authorName = m.authorUser?.name ?? m.authorClient?.name ?? "?";
          return (
            <div key={m.id} className={cn("flex flex-col max-w-[80%]", isMe ? "self-end items-end" : "self-start items-start")}>
              <span className="max-w-full truncate text-[11px] text-muted-2 mb-1 px-2">
                {isMe ? "Você" : authorName} · {timeOf(m.createdAt)}
              </span>
              <div
                className={cn(
                  "rounded-3xl px-4 py-2.5 text-sm leading-relaxed break-words",
                  isMe
                    ? "bg-accent text-black rounded-br-lg"
                    : "bg-surface-2 text-ink rounded-bl-lg",
                )}
              >
                {m.text}
              </div>
              {m.mentionedUser && (
                <span className="text-[10px] text-accent mt-1 px-2">@{m.mentionedUser.name} foi marcado</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-4 pt-2 flex-shrink-0">
        <MentionComposer
          mentionableUsers={mentionableUsers}
          onSend={handleSend}
          sending={sending}
          placeholder="Escreva uma mensagem curta... use @ para marcar alguém"
        />
      </div>
    </Card>
  );
}
