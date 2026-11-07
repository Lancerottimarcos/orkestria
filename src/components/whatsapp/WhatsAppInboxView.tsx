"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, User as UserIcon, Link2, Link2Off } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

const CONVERSATIONS_POLL_MS = 8000;
const MESSAGES_POLL_MS = 5000;

type Conversation = {
  id: string;
  phoneNumber: string;
  contactName: string | null;
  lastMessageAt: string;
  client: { id: string; name: string; avatarUrl: string | null } | null;
  lastMessage: string | null;
};

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  text: string | null;
  createdAt: string;
  sentByUser: { id: string; name: string } | null;
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function WhatsAppInboxView({
  initialConversations,
  clients,
}: {
  initialConversations: Conversation[];
  clients: { id: string; name: string }[];
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [linkingClient, setLinkingClient] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { alertDialog } = useConfirmDialog();

  useEffect(() => {
    if (!activeId) return;
    setLoadingMessages(true);
    fetch(`/api/whatsapp/conversations/${activeId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .finally(() => setLoadingMessages(false));
  }, [activeId]);

  // Sem isso a inbox era um retrato estático - mensagem nova só aparecia
  // depois de recarregar a página na mão. Polling simples em vez de um canal
  // dedicado (WebSocket/SSE): suficiente pro volume de uma agência, sem
  // precisar de infraestrutura nova.
  useEffect(() => {
    const id = setInterval(() => {
      fetch("/api/whatsapp/conversations")
        .then((r) => r.json())
        .then((data) => Array.isArray(data) && setConversations(data));
    }, CONVERSATIONS_POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const id = setInterval(() => {
      fetch(`/api/whatsapp/conversations/${activeId}/messages`)
        .then((r) => r.json())
        .then((data) => {
          if (!Array.isArray(data)) return;
          // Só substitui se algo realmente mudou - evita re-render (e
          // qualquer flicker de scroll) em todo tick sem mensagem nova.
          setMessages((prev) => (prev.length !== data.length ? data : prev));
        });
    }, MESSAGES_POLL_MS);
    return () => clearInterval(id);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function handleLinkClient(clientId: string) {
    if (!activeId) return;
    setLinkingClient(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, client: data.client } : c)));
      } else {
        await alertDialog(data?.error || "Não foi possível vincular o cliente.");
      }
    } finally {
      setLinkingClient(false);
    }
  }

  async function handleSend() {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, data]);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, lastMessage: draft.trim(), lastMessageAt: new Date().toISOString() } : c)),
        );
        setDraft("");
      } else {
        await alertDialog(data?.error || "Não foi possível enviar a mensagem.");
      }
    } finally {
      setSending(false);
    }
  }

  const active = conversations.find((c) => c.id === activeId);

  return (
    <div>
      <PageHeader title="WhatsApp" description="Conversas recebidas pelo número de WhatsApp Business da agência." />

      {conversations.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<MessageCircle size={20} strokeWidth={1.8} />}
            title="Nenhuma conversa ainda"
            description="Assim que alguém escrever pro número de WhatsApp configurado, a conversa aparece aqui."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 h-[calc(100vh-220px)] min-h-[420px]">
          <Card padding="none" className="overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border last:border-0 transition-colors cursor-pointer",
                  activeId === c.id ? "bg-surface-2" : "hover:bg-surface-2/60",
                )}
              >
                <Avatar name={c.client?.name ?? c.contactName ?? c.phoneNumber} url={c.client?.avatarUrl ?? null} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">{c.client?.name ?? c.contactName ?? c.phoneNumber}</p>
                  <p className="text-xs text-muted truncate">{c.lastMessage ?? "-"}</p>
                </div>
                <span className="text-[10px] text-muted-2 flex-shrink-0">{timeOf(c.lastMessageAt)}</span>
              </button>
            ))}
          </Card>

          <Card padding="none" className="flex flex-col overflow-hidden">
            {active && (
              <div className="px-5 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
                <Avatar name={active.client?.name ?? active.contactName ?? active.phoneNumber} url={active.client?.avatarUrl ?? null} size={34} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{active.client?.name ?? active.contactName ?? active.phoneNumber}</p>
                  <p className="text-xs text-muted-2">{active.phoneNumber}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                  {active.client ? <Link2 size={12} className="text-success" /> : <Link2Off size={12} className="text-muted-2" />}
                  <Select
                    value={active.client?.id ?? ""}
                    disabled={linkingClient}
                    onChange={(e) => handleLinkClient(e.target.value)}
                    className="!w-auto max-w-40 !py-1.5 !text-xs"
                  >
                    <option value="">Sem cliente vinculado</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
              {loadingMessages ? (
                <p className="text-xs text-muted text-center py-8">Carregando...</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "OUTBOUND" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                        m.direction === "OUTBOUND" ? "bg-accent text-white" : "bg-surface-2 text-ink",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={cn("text-[10px] mt-1 flex items-center gap-1", m.direction === "OUTBOUND" ? "text-white/70" : "text-muted-2")}>
                        {m.direction === "OUTBOUND" && m.sentByUser && (
                          <>
                            <UserIcon size={9} /> {m.sentByUser.name} ·
                          </>
                        )}
                        {timeOf(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center gap-2.5 flex-shrink-0">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escreva uma mensagem..."
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={sending || !draft.trim()}>
                <Send size={15} />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
