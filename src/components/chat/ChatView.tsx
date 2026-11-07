"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, MoreVertical, Pin, Palette, ListPlus, MessagesSquare, Reply, AtSign, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { DottedDivider } from "@/components/ui/Dotted";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Input";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Checkbox } from "@/components/ui/Checkbox";
import { COVER_GRADIENTS } from "@/lib/coverGradient";
import { MentionComposer } from "./MentionComposer";
import { CreateTaskFromMessageModal } from "./CreateTaskFromMessageModal";
import { ChannelAvatar } from "./ChannelAvatar";
import { cn } from "@/lib/cn";

type ChannelKind = "SECTOR" | "GROUP" | "CLIENT" | "DM";

type ChannelSummary = {
  id: string;
  name: string;
  kind: ChannelKind;
  sector: string | null;
  avatarUrl: string | null;
  color: string | null;
  clientId: string | null;
  client: { name: string } | null;
  memberCount: number;
  pinned: boolean;
  unreadCount: number;
  hasUnreadMention: boolean;
  lastMessage: {
    text: string;
    createdAt: string;
    authorUser: { name: string } | null;
    authorClient: { name: string } | null;
  } | null;
};

type Message = {
  id: string;
  text: string;
  createdAt: string;
  authorUser: { id: string; name: string } | null;
  authorClient: { id: string; name: string } | null;
  mentionedUser: { id: string; name: string } | null;
  replyTo: {
    id: string;
    text: string;
    authorUser: { id: string; name: string } | null;
    authorClient: { id: string; name: string } | null;
  } | null;
};

type MentionUser = { id: string; name: string; setor: string | null };

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sortChannels(list: ChannelSummary[]) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bt - at;
  });
}

const FILTER_TABS: { key: "all" | "unread" | "groups"; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "unread", label: "Não lidas" },
  { key: "groups", label: "Grupos" },
];

export function ChatView({
  initialChannels,
  mentionableUsers,
  currentUserId,
}: {
  initialChannels: ChannelSummary[];
  mentionableUsers: MentionUser[];
  currentUserId: string;
}) {
  const [channels, setChannels] = useState(sortChannels(initialChannels));
  const [activeId, setActiveId] = useState<string | null>(channels[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "groups">("all");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [customizeTarget, setCustomizeTarget] = useState<ChannelSummary | null>(null);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [taskMessage, setTaskMessage] = useState<{ text: string; clientId: string | null; clientName: string | null } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string; text: string } | null>(null);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = channels.find((c) => c.id === activeId) ?? null;

  async function refreshChannels() {
    const res = await fetch("/api/chat/channels");
    if (res.ok) setChannels(sortChannels(await res.json()));
  }

  async function loadMessages(channelId: string) {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/messages`);
      if (res.ok) setMessages(await res.json());
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!activeId) return;
    setReplyingTo(null);
    loadMessages(activeId);
    const interval = setInterval(() => loadMessages(activeId), 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    const interval = setInterval(refreshChannels, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!menuForId) return;
    const close = () => {
      setMenuForId(null);
      setMenuAnchor(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [menuForId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function selectChannel(id: string) {
    setActiveId(id);
    setShowThreadOnMobile(true);
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    fetch(`/api/chat/channels/${id}/read`, { method: "POST" });
  }

  async function handleSend(text: string, mentionedUserId: string | null) {
    if (!activeId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/channels/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mentionedUserId: mentionedUserId || "", replyToId: replyingTo?.id || "" }),
      });
      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
        setReplyingTo(null);
        setChannels((prev) =>
          sortChannels(
            prev.map((c) =>
              c.id === activeId
                ? { ...c, lastMessage: { text: message.text, createdAt: message.createdAt, authorUser: message.authorUser, authorClient: message.authorClient } }
                : c,
            ),
          ),
        );
      }
    } finally {
      setSending(false);
    }
  }

  async function togglePin(channelId: string) {
    setMenuForId(null);
    const res = await fetch(`/api/chat/channels/${channelId}/pin`, { method: "PATCH" });
    if (res.ok) {
      const { pinned } = await res.json();
      setChannels((prev) => sortChannels(prev.map((c) => (c.id === channelId ? { ...c, pinned } : c))));
    }
  }

  const filtered = useMemo(() => {
    let list = channels;
    if (filterTab === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filterTab === "groups") list = list.filter((c) => c.kind === "GROUP");
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list;
  }, [channels, filterTab, search]);

  return (
    <div>
      <PageHeader
        title="Chat"
        description="Converse com a equipe em grupos ou direto, e responda os clientes"
        actions={
          <Button size="sm" onClick={() => setNewChatOpen(true)}>
            <Plus size={14} /> Nova conversa
          </Button>
        }
      />

      <div className="flex gap-6 h-[calc(100vh-13rem)] min-h-[26rem]">
        <Panel
          padding="none"
          className={cn(
            "w-full md:w-80 flex-shrink-0 flex-col overflow-hidden",
            showThreadOnMobile ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-4 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-panel-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar conversa"
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-panel-2 text-sm text-panel-ink outline-none placeholder:text-panel-muted focus:ring-1 focus:ring-accent"
              />
            </div>
            <div className="flex gap-1.5 mt-3">
              {FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setFilterTab(t.key)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer",
                    filterTab === t.key ? "bg-accent text-black" : "bg-panel-2 text-panel-muted hover:text-panel-ink",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 text-center py-12 px-4">
                <span className="w-12 h-12 rounded-full bg-panel-2 flex items-center justify-center text-panel-muted">
                  {channels.length === 0 ? <MessagesSquare size={18} strokeWidth={1.8} /> : <Search size={16} strokeWidth={1.8} />}
                </span>
                <div>
                  <p className="text-sm font-semibold text-panel-ink">
                    {channels.length === 0 ? "Nenhuma conversa ainda" : "Nenhuma conversa encontrada"}
                  </p>
                  <p className="text-xs text-panel-muted mt-1 max-w-[15rem]">
                    {channels.length === 0
                      ? "Inicie uma nova conversa direta ou crie um grupo pra começar."
                      : "Ajuste a busca ou o filtro pra encontrar o que procura."}
                  </p>
                </div>
              </div>
            )}
            {filtered.map((c, i) => {
              const last = c.lastMessage;
              const lastAuthor = last?.authorUser?.name ?? last?.authorClient?.name;
              return (
                <div key={c.id}>
                  {i > 0 && <div className="border-t border-dotted border-panel-muted/25 mx-3" />}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => selectChannel(c.id)}
                    onKeyDown={(e) => e.key === "Enter" && selectChannel(c.id)}
                    className={cn(
                      "relative group flex items-center gap-3 px-3.5 py-3.5 rounded-3xl cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                      activeId === c.id ? "bg-panel-2" : c.hasUnreadMention ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-panel-2/60",
                    )}
                  >
                    <ChannelAvatar id={c.id} name={c.name} avatarUrl={c.avatarUrl} color={c.color} kind={c.kind} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("flex items-center gap-1.5 min-w-0 text-sm font-semibold truncate", activeId === c.id ? "text-accent" : "text-panel-ink")}>
                          {c.hasUnreadMention && (
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent text-black flex items-center justify-center" title="Você foi marcado">
                              <AtSign size={10} strokeWidth={2.5} />
                            </span>
                          )}
                          <span className="truncate">{c.name}</span>
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {c.pinned && <Pin size={11} className="text-panel-muted" />}
                          {last && <span className="text-[10px] text-panel-muted tabular-nums">{timeOf(last.createdAt)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs text-panel-muted truncate">
                          {last ? `${lastAuthor ? `${lastAuthor}: ` : ""}${last.text}` : "Sem mensagens ainda"}
                        </span>
                        {c.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-black text-[10px] font-bold flex items-center justify-center">
                            {c.unreadCount > 99 ? "99+" : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (menuForId === c.id) {
                          setMenuForId(null);
                          setMenuAnchor(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                          setMenuForId(c.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0 p-1.5 rounded-full text-panel-muted hover:text-panel-ink hover:bg-black/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuForId === c.id && menuAnchor && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ top: menuAnchor.top, right: menuAnchor.right }}
                        className="fixed z-20 bg-panel-2 rounded-2xl shadow-xl shadow-black/40 py-1.5 w-44"
                      >
                        <button
                          type="button"
                          onClick={() => togglePin(c.id)}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-panel-ink hover:text-accent flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Pin size={12} /> {c.pinned ? "Desafixar" : "Fixar"}
                        </button>
                        {c.kind === "GROUP" && (
                          <button
                            type="button"
                            onClick={() => {
                              setMenuForId(null);
                              setCustomizeTarget(c);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-semibold text-panel-ink hover:text-accent flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Palette size={12} /> Personalizar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Card
          padding="none"
          className={cn(
            "flex-1 min-w-0 flex-col overflow-hidden",
            showThreadOnMobile ? "flex" : "hidden md:flex",
          )}
        >
          {!active ? (
            <EmptyState
              icon={<MessagesSquare size={20} />}
              title="Selecione uma conversa"
              description="Escolha uma conversa à esquerda ou inicie uma nova para começar a conversar."
            />
          ) : (
            <>
              <div className="px-4 sm:px-7 py-5 flex items-center gap-3 sm:gap-3.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowThreadOnMobile(false)}
                  className="md:hidden flex-shrink-0 -ml-1 p-1.5 rounded-full text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  title="Voltar para conversas"
                >
                  <ChevronLeft size={18} />
                </button>
                <ChannelAvatar id={active.id} name={active.name} avatarUrl={active.avatarUrl} color={active.color} kind={active.kind} size={44} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => active.kind === "GROUP" && setCustomizeTarget(active)}
                    className={cn(
                      "text-base font-semibold text-ink truncate block text-left",
                      active.kind === "GROUP" && "hover:text-accent cursor-pointer",
                    )}
                  >
                    {active.name}
                  </button>
                  {active.kind === "GROUP" && <span className="text-xs text-muted">{active.memberCount} membros</span>}
                </div>
              </div>
              <DottedDivider className="mx-4 sm:mx-7" />

              <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-7 py-5 sm:py-7 flex flex-col gap-5">
                {loadingMessages && messages.length === 0 && (
                  <p className="text-xs text-muted-2 text-center my-auto">Carregando mensagens...</p>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <p className="text-xs text-muted-2 text-center my-auto">Nenhuma mensagem ainda. Diga oi.</p>
                )}
                {messages.map((m) => {
                  const isMe = m.authorUser?.id === currentUserId;
                  const authorName = m.authorUser?.name ?? m.authorClient?.name ?? "?";
                  const replyAuthorName = m.replyTo?.authorUser?.name ?? m.replyTo?.authorClient?.name ?? "?";
                  return (
                    <div key={m.id} className={cn("flex flex-col max-w-[88%] sm:max-w-[75%] group", isMe ? "self-end items-end" : "self-start items-start")}>
                      <span className="max-w-full truncate text-[11px] text-muted-2 mb-1 px-2">
                        {m.authorClient ? `${authorName} · cliente` : authorName} · {timeOf(m.createdAt)}
                      </span>
                      <div className="flex items-end gap-1.5">
                        <div
                          className={cn(
                            "min-w-0 rounded-3xl px-5 py-3 text-sm leading-relaxed break-words",
                            isMe
                              ? "bg-accent text-black rounded-br-lg"
                              : m.authorClient
                                ? "bg-accent-dim/20 text-ink rounded-bl-lg"
                                : "bg-surface-2 text-ink rounded-bl-lg",
                          )}
                        >
                          {m.replyTo && (
                            <div
                              className={cn(
                                "rounded-2xl px-3 py-2 mb-2 text-xs",
                                isMe ? "bg-black/10" : "bg-surface-3/70",
                              )}
                            >
                              <p className={cn("font-semibold mb-0.5", isMe ? "text-black/85" : "text-ink/80")}>{replyAuthorName}</p>
                              <p className={cn("truncate", isMe ? "text-black/65" : "text-muted-2")}>{m.replyTo.text}</p>
                            </div>
                          )}
                          {m.text}
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo({ id: m.id, authorName, text: m.text })}
                          title="Responder"
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-2 hover:text-accent hover:bg-surface-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                        >
                          <Reply size={13} />
                        </button>
                        {m.authorClient && (
                          <button
                            type="button"
                            onClick={() =>
                              setTaskMessage({
                                text: m.text,
                                clientId: m.authorClient!.id,
                                clientName: m.authorClient!.name,
                              })
                            }
                            title="Criar tarefa no Kanban a partir desta mensagem"
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-muted-2 hover:text-accent hover:bg-surface-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer mb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                          >
                            <ListPlus size={13} />
                          </button>
                        )}
                      </div>
                      {m.mentionedUser && (
                        <span className="text-[10px] text-accent mt-1 px-2">@{m.mentionedUser.name} foi marcado</span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-4 sm:px-7 pb-5 pt-2 flex-shrink-0">
                <MentionComposer
                  mentionableUsers={mentionableUsers}
                  onSend={handleSend}
                  sending={sending}
                  placeholder="Escreva uma mensagem... use @ para marcar alguém"
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </div>
            </>
          )}
        </Card>
      </div>

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        staffUsers={mentionableUsers}
        onOpenDM={async (userId) => {
          const res = await fetch("/api/chat/channels/dm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          if (res.ok) {
            const { id } = await res.json();
            await refreshChannels();
            setActiveId(id);
            setNewChatOpen(false);
          }
        }}
        onCreatedGroup={async (channel) => {
          await refreshChannels();
          setActiveId(channel.id);
          setNewChatOpen(false);
        }}
      />

      <CustomizeChannelModal
        channel={customizeTarget}
        onClose={() => setCustomizeTarget(null)}
        onSaved={(updated) => {
          setChannels((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
          setCustomizeTarget(null);
        }}
      />

      <CreateTaskFromMessageModal
        open={!!taskMessage}
        onClose={() => setTaskMessage(null)}
        message={taskMessage}
      />
    </div>
  );
}

function NewChatModal({
  open,
  onClose,
  staffUsers,
  onOpenDM,
  onCreatedGroup,
}: {
  open: boolean;
  onClose: () => void;
  staffUsers: MentionUser[];
  onOpenDM: (userId: string) => void;
  onCreatedGroup: (channel: { id: string }) => void;
}) {
  const [mode, setMode] = useState<"dm" | "group" | "sector">("dm");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setMode("dm");
    setName("");
    setSector("");
    setMemberIds([]);
    setColor(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreateChannel() {
    setError(null);
    if (!name.trim()) {
      setError(mode === "sector" ? "Informe o nome do setor" : "Informe o nome do grupo");
      return;
    }
    if (mode === "sector" && !sector.trim()) {
      setError("Informe o identificador do setor");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          kind: mode === "sector" ? "SECTOR" : "GROUP",
          sector,
          memberIds,
          color: color ?? "",
        }),
      });
      if (res.ok) {
        const channel = await res.json();
        reset();
        onCreatedGroup(channel);
      } else {
        const json = await res.json().catch(() => null);
        setError(json?.error?.fieldErrors?.sector?.[0] ?? "Não foi possível criar");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Nova" titleAccent="conversa">
      <div className="flex flex-col gap-5">
        <div className="flex gap-1.5">
          {([
            { key: "dm", label: "Direta" },
            { key: "group", label: "Grupo" },
            { key: "sector", label: "Setor" },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setMode(t.key)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer",
                mode === t.key ? "bg-accent text-black" : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "dm" ? (
          <Field label="Conversar com">
            <div className="flex flex-col max-h-64 overflow-y-auto">
              {staffUsers.map((u, i) => (
                <div key={u.id}>
                  {i > 0 && <DottedDivider className="mx-3" />}
                  <button
                    type="button"
                    onClick={() => onOpenDM(u.id)}
                    className="w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-2xl hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-accent/12 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink truncate">{u.name}</span>
                      {u.setor && <span className="block text-xs text-muted-2">{u.setor}</span>}
                    </span>
                  </button>
                </div>
              ))}
              {staffUsers.length === 0 && (
                <p className="text-xs text-muted-2 px-3 py-4">Nenhuma outra pessoa disponível.</p>
              )}
            </div>
          </Field>
        ) : (
          <>
            <Field label={mode === "sector" ? "Nome do setor" : "Nome do grupo"}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode === "sector" ? "Ex: Time de Design" : "Ex: Projeto Verão"}
              />
            </Field>

            {mode === "sector" && (
              <Field label="Identificador do setor" hint="Membros com esse setor no perfil veem o canal automaticamente">
                <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex: Design" />
              </Field>
            )}

            {mode === "group" && (
              <>
                <Field label="Cor do grupo">
                  <div className="flex items-center gap-4 bg-surface-2 rounded-3xl p-3">
                    <ChannelAvatar id="new-group" name={name || "?"} avatarUrl={null} color={color} kind="GROUP" size={40} />
                    <div className="flex flex-wrap gap-2">
                      {COVER_GRADIENTS.map((g) => (
                        <button
                          key={g.key}
                          type="button"
                          title="Escolher cor"
                          onClick={() => setColor(g.key)}
                          className={cn(
                            "w-6 h-6 rounded-full bg-gradient-to-br cursor-pointer transition-transform hover:scale-110",
                            g.classes,
                            color === g.key && "ring-2 ring-offset-2 ring-offset-surface-2 ring-ink",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </Field>

                <Field label="Membros">
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto bg-surface-2 rounded-3xl p-3">
                    {staffUsers.map((u) => (
                      <label key={u.id} className="flex items-center gap-2.5 text-sm text-ink px-2.5 py-1.5 rounded-full hover:bg-surface-3 cursor-pointer transition-colors">
                        <Checkbox
                          checked={memberIds.includes(u.id)}
                          onChange={(e) =>
                            setMemberIds((prev) =>
                              e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id),
                            )
                          }
                        />
                        {u.name}
                        {u.setor && <span className="text-xs text-muted-2">· {u.setor}</span>}
                      </label>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex justify-end gap-2 mt-1">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleCreateChannel} disabled={submitting}>
                {submitting ? "Criando..." : mode === "sector" ? "Criar setor" : "Criar grupo"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function CustomizeChannelModal({
  channel,
  onClose,
  onSaved,
}: {
  channel: ChannelSummary | null;
  onClose: () => void;
  onSaved: (updated: { id: string; name: string; avatarUrl: string | null; color: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setColor(channel.color);
      setError(null);
    }
  }, [channel]);

  async function handleSave() {
    if (!channel) return;
    if (!name.trim()) {
      setError("Informe o nome do grupo");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/chat/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: color ?? "" }),
      });
      if (res.ok) {
        onSaved(await res.json());
      } else {
        setError("Não foi possível salvar");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={!!channel} onClose={onClose} title="Personalizar" titleAccent="grupo">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 bg-surface-2 rounded-3xl p-4">
          <ChannelAvatar id={channel?.id ?? "preview"} name={name || "?"} avatarUrl={null} color={color} kind="GROUP" size={48} />
          <div className="flex flex-wrap gap-2">
            {COVER_GRADIENTS.map((g) => (
              <button
                key={g.key}
                type="button"
                title="Escolher cor"
                onClick={() => setColor(g.key)}
                className={cn(
                  "w-7 h-7 rounded-full bg-gradient-to-br cursor-pointer transition-transform hover:scale-110",
                  g.classes,
                  color === g.key && "ring-2 ring-offset-2 ring-offset-surface-2 ring-ink",
                )}
              />
            ))}
          </div>
        </div>

        <Field label="Nome do grupo">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex justify-end gap-2 mt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
