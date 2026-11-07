"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  Plus,
  LayoutGrid,
  List,
  CalendarDays,
  GanttChartSquare,
  Settings2,
  Image as ImageIcon,
  ImageOff,
  GalleryThumbnails,
  Tag,
  User,
  Building2,
  Layers,
  CheckCircle2,
  ArchiveRestore,
  Trash2,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { FilterBar, FilterSearch, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { ViewTabs } from "@/components/views/ViewTabs";
import { MiniCalendar } from "@/components/views/MiniCalendar";
import { GanttChart } from "@/components/views/GanttChart";
import { DemandTypeManager } from "@/components/demand-types/DemandTypeManager";
import { BoardManager } from "./BoardManager";
import { CardItem, type CardImageMode } from "./CardItem";
import { ColumnItem } from "./ColumnItem";
import { CardModal } from "./CardModal";
import { KanbanListView } from "./KanbanListView";
import { SchedulePostModal } from "./SchedulePostModal";
import type { KanbanCardData, KanbanColumnData, KanbanBoardData, ArchivedCardData, Option, ClientOption, UserOption, DemandTypeOption, AttachmentType, SocialNetwork } from "./types";
import type { KanbanCardInput } from "@/lib/schemas";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/PageHeader";
import { DottedDivider } from "@/components/ui/Dotted";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type View = "board" | "list" | "calendar" | "gantt" | "archive";

const CARD_IMAGE_MODE_KEY = "kanban-card-image-mode";
const CARD_IMAGE_MODES: CardImageMode[] = ["thumbnail", "cover", "hidden"];
const cardImageModeListeners = new Set<() => void>();

function subscribeCardImageMode(callback: () => void) {
  cardImageModeListeners.add(callback);
  return () => cardImageModeListeners.delete(callback);
}
function getCardImageModeSnapshot(): CardImageMode {
  const stored = localStorage.getItem(CARD_IMAGE_MODE_KEY);
  return (CARD_IMAGE_MODES as string[]).includes(stored ?? "") ? (stored as CardImageMode) : "thumbnail";
}
function getCardImageModeServerSnapshot(): CardImageMode {
  return "thumbnail";
}
function setCardImageMode(value: CardImageMode) {
  localStorage.setItem(CARD_IMAGE_MODE_KEY, value);
  cardImageModeListeners.forEach((callback) => callback());
}

function findColumnIdOfCard(columns: KanbanColumnData[], cardId: string) {
  return columns.find((col) => col.cards.some((c) => c.id === cardId))?.id;
}

export function KanbanBoard({
  initialBoards,
  initialColumns,
  initialArchived,
  clients,
  projects,
  users,
  initialDemandTypes,
  initialClientId,
  currentUserId,
}: {
  initialBoards: KanbanBoardData[];
  initialColumns: KanbanColumnData[];
  initialArchived: ArchivedCardData[];
  clients: ClientOption[];
  projects: Option[];
  users: UserOption[];
  initialDemandTypes: DemandTypeOption[];
  initialClientId?: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(initialColumns);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [boards, setBoards] = useState(initialBoards);
  const [archived, setArchived] = useState(initialArchived);
  const [activeBoardId, setActiveBoardId] = useState(() => {
    if (initialClientId) {
      const dedicated = initialBoards.find((b) => b.client?.id === initialClientId);
      if (dedicated) return dedicated.id;
      const withCard = initialBoards.find((b) =>
        initialColumns.some((c) => c.boardId === b.id && c.cards.some((card) => card.client?.id === initialClientId)),
      );
      if (withCard) return withCard.id;
    }
    return initialBoards[0]?.id ?? "";
  });
  const [boardManagerOpen, setBoardManagerOpen] = useState(false);
  const [demandTypes, setDemandTypes] = useState(initialDemandTypes);
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);
  const [view, setView] = useState<View>("board");
  const [activeCard, setActiveCard] = useState<KanbanCardData | null>(null);
  const dragSnapshotRef = useRef<typeof columns | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCardData | null>(null);
  const [defaultColumnId, setDefaultColumnId] = useState("");
  const [createNonce, setCreateNonce] = useState(0);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleModalCard, setScheduleModalCard] = useState<KanbanCardData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [clientFilter, setClientFilter] = useState(initialClientId ?? "");
  const [typeFilter, setTypeFilter] = useState("");
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const imageMode = useSyncExternalStore(
    subscribeCardImageMode,
    getCardImageModeSnapshot,
    getCardImageModeServerSnapshot,
  );

  function handleBoardsChange(next: KanbanBoardData[]) {
    const added = next.find((b) => !boards.some((existing) => existing.id === b.id));
    if (added) {
      setActiveBoardId(added.id);
    } else if (!next.some((b) => b.id === activeBoardId)) {
      setActiveBoardId(next[0]?.id ?? "");
    }
    setBoards(next);
  }

  const boardColumns = useMemo(
    () => columns.filter((c) => c.boardId === activeBoardId),
    [columns, activeBoardId],
  );

  const filterActive =
    search.trim() !== "" || priorityFilter !== "" || assigneeFilter !== "" || clientFilter !== "" || typeFilter !== "";

  function matchesFilter(card: KanbanCardData) {
    if (search.trim() && !card.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (priorityFilter && card.priority !== priorityFilter) return false;
    if (assigneeFilter && card.assignee?.id !== assigneeFilter) return false;
    if (clientFilter && card.client?.id !== clientFilter) return false;
    if (typeFilter && card.demandType?.id !== typeFilter) return false;
    return true;
  }

  const totalVisible = useMemo(
    () => boardColumns.reduce((sum, c) => sum + c.cards.filter(matchesFilter).length, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardColumns, search, priorityFilter, assigneeFilter, clientFilter, typeFilter],
  );

  const visibleColumns = useMemo(
    () => boardColumns.map((c) => ({ ...c, cards: c.cards.filter(matchesFilter) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardColumns, search, priorityFilter, assigneeFilter, clientFilter, typeFilter],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    // Guarda o estado de antes do drag pra poder reverter se a persistência
    // no servidor falhar - handleDragOver já move o card entre colunas ao
    // vivo, então por handleDragEnd o estado otimista já está aplicado.
    dragSnapshotRef.current = columns;
    const cardId = event.active.id as string;
    const col = columns.find((c) => c.cards.some((card) => card.id === cardId));
    const card = col?.cards.find((c) => c.id === cardId) ?? null;
    setActiveCard(card);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const fromColumnId = findColumnIdOfCard(columns, activeId);
    const toColumnId = findColumnIdOfCard(columns, overId) ?? overId;
    if (!fromColumnId || !toColumnId || fromColumnId === toColumnId) return;
    if (!columns.some((c) => c.id === toColumnId)) return;

    setColumns((prev) => {
      const fromCol = prev.find((c) => c.id === fromColumnId)!;
      const card = fromCol.cards.find((c) => c.id === activeId);
      if (!card) return prev;

      return prev.map((col) => {
        if (col.id === fromColumnId) {
          return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        }
        if (col.id === toColumnId) {
          const overIndex = col.cards.findIndex((c) => c.id === overId);
          const insertAt = overIndex >= 0 ? overIndex : col.cards.length;
          const newCards = [...col.cards];
          newCards.splice(insertAt, 0, { ...card, columnId: toColumnId });
          return { ...col, cards: newCards };
        }
        return col;
      });
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const startCard = activeCard;
    setActiveCard(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const columnId = findColumnIdOfCard(columns, activeId);
    if (!columnId) return;

    // Power-up "Abrir agendamento de publicação": soltar a demanda numa coluna
    // com esse power-up ativo abre o formulário de rede social, data e horário.
    if (startCard && startCard.columnId !== columnId) {
      const destColumn = columns.find((c) => c.id === columnId);
      if (destColumn?.hasScheduleAutomation) {
        setScheduleModalCard({ ...startCard, columnId });
        setScheduleModalOpen(true);
      }
    }

    let finalColumns = columns;
    if (activeId !== overId) {
      const col = columns.find((c) => c.id === columnId)!;
      const oldIndex = col.cards.findIndex((c) => c.id === activeId);
      const overIndex = col.cards.findIndex((c) => c.id === overId);
      if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
        finalColumns = columns.map((c) =>
          c.id === columnId ? { ...c, cards: arrayMove(c.cards, oldIndex, overIndex) } : c,
        );
        setColumns(finalColumns);
      }
    }

    const affected = finalColumns.filter((c) =>
      c.id === columnId || c.cards.some((card) => card.id === activeId),
    );
    const payload = {
      columns: affected.map((c) => ({ columnId: c.id, cardIds: c.cards.map((card) => card.id) })),
    };

    const res = await fetch("/api/kanban/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      // Sem isso, a tela ficava mostrando o card na posição/coluna nova pra
      // sempre (router.refresh() não reinicializa o useState local), mesmo
      // o banco tendo ficado com a posição antiga.
      if (dragSnapshotRef.current) setColumns(dragSnapshotRef.current);
      await alertDialog("Não foi possível mover o card - tente novamente.");
      return;
    }
    router.refresh();
  }

  function handleColumnDragStart(columnId: string) {
    setDraggingColumnId(columnId);
  }

  function handleColumnDragEnd() {
    setDraggingColumnId(null);
  }

  async function handleColumnDrop(overColumnId: string) {
    if (!draggingColumnId || draggingColumnId === overColumnId) {
      setDraggingColumnId(null);
      return;
    }
    const fromIndex = boardColumns.findIndex((c) => c.id === draggingColumnId);
    const toIndex = boardColumns.findIndex((c) => c.id === overColumnId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingColumnId(null);
      return;
    }
    const previousColumns = columns;
    const reordered = arrayMove(boardColumns, fromIndex, toIndex);
    const otherColumns = columns.filter((c) => c.boardId !== activeBoardId);
    setColumns([...otherColumns, ...reordered]);
    setDraggingColumnId(null);

    const res = await fetch("/api/kanban/columns/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnIds: reordered.map((c) => c.id) }),
    });
    if (!res.ok) {
      setColumns(previousColumns);
      await alertDialog("Não foi possível reordenar as colunas - tente novamente.");
      return;
    }
    router.refresh();
  }

  async function handleColumnColorChange(columnId: string, color: string) {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return;
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, color } : c)));
    await fetch(`/api/kanban/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: column.name, color }),
    });
    router.refresh();
  }

  function openCreateCard(columnId: string) {
    setEditingCard(null);
    setDefaultColumnId(columnId);
    // Key nova a cada criação: remonta o modal limpo, sem anexos/campos da demanda anterior
    setCreateNonce((n) => n + 1);
    setModalOpen(true);
  }

  function openEditCard(card: KanbanCardData) {
    setEditingCard(card);
    setDefaultColumnId(card.columnId);
    setModalOpen(true);
  }

  function openScheduleModal(card: KanbanCardData) {
    setScheduleModalCard(card);
    setScheduleModalOpen(true);
  }

  async function handleUnmarkComplete(card: KanbanCardData) {
    const res = await fetch(`/api/kanban/cards/${card.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: false }),
    });
    if (res.ok) {
      const updated = await res.json();
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          cards: c.cards.map((card) => (card.id === updated.id ? updated : card)),
        })),
      );
      router.refresh();
    }
  }

  async function handleScheduleSubmit(network: SocialNetwork, date: string, time: string) {
    if (!scheduleModalCard) return;
    const scheduledAt = new Date(`${date}T${time}`).toISOString();
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network, scheduledAt }),
    });
    if (res.ok) {
      const updated = await res.json();
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          cards: c.cards.map((card) => (card.id === updated.id ? updated : card)),
        })),
      );
      // 207 (parcialmente publicado) também cai em res.ok - sem checar o
      // publishStatus de verdade, um agendamento que a rede recusou (ex:
      // YouTube sem vídeo anexado) fechava o modal como se tivesse dado certo.
      if (updated.publishStatus === "FAILED") {
        await alertDialog(updated.publishError ?? "O agendamento foi salvo, mas a publicação na rede falhou.");
      }
    }
    setScheduleModalOpen(false);
    setScheduleModalCard(null);
    router.refresh();
  }

  async function handleCancelSchedule() {
    if (!scheduleModalCard) return;
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: null, scheduledAt: null }),
    });
    if (res.ok) {
      const updated = await res.json();
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          cards: c.cards.map((card) => (card.id === updated.id ? updated : card)),
        })),
      );
      if (res.status === 207) {
        await alertDialog(
          "Cancelado aqui, mas não foi possível remover a publicação agendada do lado da rede social (token pode ter expirado) - ela pode acabar publicando sozinha no horário original. Confira manualmente na plataforma.",
        );
      }
    }
    setScheduleModalOpen(false);
    setScheduleModalCard(null);
    router.refresh();
  }

  async function handlePublishNow() {
    if (!scheduleModalCard) return;
    const res = await fetch(`/api/kanban/cards/${scheduleModalCard.id}/publish-now`, { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setColumns((prev) =>
        prev.map((c) => ({
          ...c,
          cards: c.cards.map((card) => (card.id === data.id ? data : card)),
        })),
      );
      setScheduleModalOpen(false);
      setScheduleModalCard(null);
    } else {
      await alertDialog(data?.error ?? "Falha ao publicar agora");
    }
    router.refresh();
  }

  async function handleCardSubmit(data: KanbanCardInput) {
    setSubmitting(true);
    try {
      const url = editingCard ? `/api/kanban/cards/${editingCard.id}` : "/api/kanban/cards";
      const method = editingCard ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar demanda");
      const card = await res.json();

      setColumns((prev) => {
        const withoutCard = prev.map((c) => ({
          ...c,
          cards: c.cards.filter((existing) => existing.id !== card.id),
        }));
        return withoutCard.map((c) =>
          c.id === card.columnId ? { ...c, cards: [...c.cards, card] } : c,
        );
      });
      setModalOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendToApproval(payload: {
    attachments: { url: string; type: AttachmentType; name?: string | null }[];
    caption: string;
    clientId: string;
    projectId: string;
    demandTypeId: string;
    card: KanbanCardInput;
  }) {
    if (!editingCard) return;
    const postRes = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.card.title,
        caption: payload.caption,
        attachments: payload.attachments,
        clientId: payload.clientId,
        projectId: payload.projectId,
        demandTypeId: payload.demandTypeId,
        priority: payload.card.priority,
      }),
    });
    if (!postRes.ok) throw new Error("Falha ao criar post de aprovação");
    const post = await postRes.json();

    const cardRes = await fetch(`/api/kanban/cards/${editingCard.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload.card,
        postId: post.id,
      }),
    });
    if (!cardRes.ok) throw new Error("Falha ao vincular post à demanda");
    const updatedCard = await cardRes.json();

    setColumns((prev) =>
      prev.map((c) => ({
        ...c,
        cards: c.cards.map((card) => (card.id === updatedCard.id ? updatedCard : card)),
      })),
    );
    setEditingCard(updatedCard);
    router.refresh();
  }

  async function handleDeleteCard(cardId: string) {
    if (!(await confirmDialog("Remover esta demanda?", { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/kanban/cards/${cardId}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.map((c) => ({ ...c, cards: c.cards.filter((card) => card.id !== cardId) })));
      setModalOpen(false);
      router.refresh();
    }
  }

  async function handleDeleteColumn(columnId: string) {
    const cardCount = columns.find((c) => c.id === columnId)?.cards.length ?? 0;
    const message = cardCount > 0
      ? `Remover esta coluna? ${cardCount} demanda(s) - com todos os comentários, checklists, anexos e apontamentos de tempo - serão perdidas junto.`
      : "Remover esta coluna?";
    if (!(await confirmDialog(message, { confirmLabel: "Remover" }))) return;
    const res = await fetch(`/api/kanban/columns/${columnId}`, { method: "DELETE" });
    if (res.ok) {
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      router.refresh();
    }
  }

  async function handleRenameColumn(columnId: string, name: string) {
    const column = columns.find((c) => c.id === columnId);
    const res = await fetch(`/api/kanban/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: column?.color ?? "" }),
    });
    if (res.ok) {
      setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
      router.refresh();
    }
  }

  async function handleAddColumn() {
    if (!newColumnName.trim()) {
      setAddingColumn(false);
      return;
    }
    const res = await fetch("/api/kanban/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newColumnName.trim(), boardId: activeBoardId }),
    });
    if (res.ok) {
      const column = await res.json();
      setColumns((prev) => [...prev, { ...column, cards: [] }]);
    }
    setNewColumnName("");
    setAddingColumn(false);
    router.refresh();
  }

  const filteredArchived = useMemo(
    () =>
      archived.filter((card) => {
        if (search.trim() && !card.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (priorityFilter && card.priority !== priorityFilter) return false;
        if (assigneeFilter && card.assignee?.id !== assigneeFilter) return false;
        if (clientFilter && card.client?.id !== clientFilter) return false;
        if (typeFilter && card.demandType?.id !== typeFilter) return false;
        return true;
      }),
    [archived, search, priorityFilter, assigneeFilter, clientFilter, typeFilter],
  );

  async function handleRestoreArchived(cardId: string) {
    const res = await fetch(`/api/kanban/cards/${cardId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (!res.ok) return;
    const card = await res.json();
    setArchived((prev) => prev.filter((c) => c.id !== cardId));
    setColumns((prev) =>
      prev.map((c) => (c.id === card.columnId ? { ...c, cards: [...c.cards, card] } : c)),
    );
    router.refresh();
  }

  async function handleDeleteArchived(cardId: string) {
    if (!(await confirmDialog("Excluir esta demanda definitivamente?", { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/kanban/cards/${cardId}`, { method: "DELETE" });
    if (res.ok) {
      setArchived((prev) => prev.filter((c) => c.id !== cardId));
      router.refresh();
    }
  }

  const calendarEvents = useMemo(
    () =>
      visibleColumns.flatMap((col) =>
        col.cards
          .filter((card) => card.dueDate)
          .map((card) => ({
            id: card.id,
            date: new Date(card.dueDate!),
            label: card.title,
            color: col.color || "#ff9f1c",
            onClick: () => openEditCard(card),
          })),
      ),
    [visibleColumns],
  );

  const ganttRows = useMemo(
    () =>
      visibleColumns.flatMap((col) =>
        col.cards.map((card) => ({
          id: card.id,
          label: card.title,
          sublabel: col.name,
          start: new Date(card.createdAt),
          end: card.dueDate ? new Date(card.dueDate) : new Date(card.createdAt),
          color: col.color || "#ff9f1c",
          onClick: () => openEditCard(card),
        })),
      ),
    [visibleColumns],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader title="Demandas" description="Gerencie as demandas da agência" />

      <FilterBar>
        <FilterSearch
          placeholder="Buscar demanda..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <FilterSelect icon={Tag} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="max-w-36">
          <option value="">Toda prioridade</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Média</option>
          <option value="LOW">Baixa</option>
        </FilterSelect>
        <FilterSelect icon={User} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="max-w-40">
          <option value="">Todo responsável</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} data-avatar-name={u.name} data-avatar-url={u.avatarUrl}>{u.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={Building2} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="max-w-40">
          <option value="">Todo cliente</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id} data-avatar-name={c.name} data-avatar-url={c.avatarUrl}>{c.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={Layers} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="max-w-40">
          <option value="">Todo tipo</option>
          {demandTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </FilterSelect>
        {filterActive && (
          <FilterClearButton
            onClick={() => {
              setSearch("");
              setPriorityFilter("");
              setAssigneeFilter("");
              setClientFilter("");
              setTypeFilter("");
            }}
          />
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          {filterActive && (
            <span className="text-xs text-muted whitespace-nowrap mr-1">{totalVisible} encontradas</span>
          )}
          <button
            type="button"
            onClick={() => setTypeManagerOpen(true)}
            title="Gerenciar tipos de demanda"
            className="w-10 h-10 rounded-full bg-surface shadow-sm shadow-black/5 flex items-center justify-center text-muted hover:text-accent transition-colors cursor-pointer flex-shrink-0"
          >
            <Settings2 size={16} strokeWidth={1.8} />
          </button>
          <div className="flex items-center gap-0.5 bg-surface shadow-sm shadow-black/5 rounded-full p-1 flex-shrink-0">
            {(
              [
                { mode: "thumbnail" as const, icon: GalleryThumbnails, title: "Imagem miniatura nos cards" },
                { mode: "cover" as const, icon: ImageIcon, title: "Com imagem nos cards" },
                { mode: "hidden" as const, icon: ImageOff, title: "Sem imagem nos cards" },
              ]
            ).map(({ mode, icon: Icon, title }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setCardImageMode(mode)}
                title={title}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                  imageMode === mode ? "bg-accent text-black" : "text-muted hover:text-accent",
                )}
              >
                <Icon size={15} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>
      </FilterBar>

      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setActiveBoardId(board.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer",
                activeBoardId === board.id
                  ? "bg-ink text-bg"
                  : "bg-surface shadow-sm shadow-black/5 text-muted hover:text-ink",
              )}
            >
              {board.name}
              {board.client && (
                <span className="text-[10px] font-medium opacity-70">· {board.client.name}</span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setBoardManagerOpen(true)}
            title="Gerenciar quadros"
            className="w-8 h-8 rounded-full border border-dashed border-border-2 flex items-center justify-center text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer flex-shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>

        <ViewTabs
          value={view}
          onChange={setView}
          options={[
            { key: "board", label: "Quadro", icon: LayoutGrid },
            { key: "list", label: "Lista", icon: List },
            { key: "calendar", label: "Calendário", icon: CalendarDays },
            { key: "gantt", label: "Gantt", icon: GanttChartSquare },
            { key: "archive", label: `Concluídas${archived.length > 0 ? ` (${archived.length})` : ""}`, icon: CheckCircle2 },
          ]}
        />
      </div>

      {view === "board" && (
        <DndContext
          id="kanban-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-5 h-full pb-4 min-w-max">
              {boardColumns.map((column) => (
                <ColumnItem
                  key={column.id}
                  column={column}
                  allColumns={boardColumns.map((c) => ({ id: c.id, name: c.name }))}
                  users={users}
                  demandTypes={demandTypes}
                  imageMode={imageMode}
                  onAddCard={openCreateCard}
                  onCardClick={openEditCard}
                  onScheduleCard={openScheduleModal}
                  onUnmarkCompleteCard={handleUnmarkComplete}
                  onDeleteCard={handleDeleteCard}
                  onDeleteColumn={handleDeleteColumn}
                  onRenameColumn={handleRenameColumn}
                  onColorChange={handleColumnColorChange}
                  matchesFilter={matchesFilter}
                  filterActive={filterActive}
                  isDragging={draggingColumnId === column.id}
                  onColumnDragStart={() => handleColumnDragStart(column.id)}
                  onColumnDragOver={(e) => e.preventDefault()}
                  onColumnDrop={() => handleColumnDrop(column.id)}
                  onColumnDragEnd={handleColumnDragEnd}
                  currentUserId={currentUserId}
                />
              ))}

              <div className="w-80 flex-shrink-0">
                {addingColumn ? (
                  <Card padding="sm" className="flex flex-col gap-3">
                    <input
                      autoFocus
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                      placeholder="Nome da coluna"
                      className="bg-surface-2 rounded-full px-4 py-2.5 text-sm text-ink outline-none border border-transparent focus:border-accent transition-colors placeholder:text-muted-2"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddColumn}>Adicionar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingColumn(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className="w-full h-12 rounded-full border border-dashed border-border-2 text-muted font-semibold text-sm flex items-center justify-center gap-2 hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  >
                    <Plus size={16} /> Nova coluna
                  </button>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="w-80 rotate-2 rounded-3xl ring-2 ring-accent shadow-2xl shadow-black/20">
                <CardItem
                  card={activeCard}
                  onClick={() => {}}
                  onDelete={() => {}}
                  imageMode={imageMode}
                  allColumns={boardColumns.map((c) => ({ id: c.id, name: c.name }))}
                  users={users}
                  demandTypes={demandTypes}
                  currentUserId={currentUserId}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {view === "list" && (
        <div className="flex-1 overflow-y-auto">
          <KanbanListView columns={visibleColumns} onCardClick={openEditCard} />
        </div>
      )}

      {view === "calendar" && (
        <div className="flex-1 overflow-y-auto">
          <MiniCalendar events={calendarEvents} />
        </div>
      )}

      {view === "gantt" && (
        <div className="flex-1 overflow-y-auto">
          <GanttChart rows={ganttRows} />
        </div>
      )}

      {view === "archive" && (
        <div className="flex-1 overflow-y-auto">
          {filteredArchived.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon={<CheckCircle2 size={22} strokeWidth={1.8} />}
                title={archived.length === 0 ? "Nenhuma demanda concluída arquivada" : "Nenhuma demanda encontrada com esses filtros"}
                description={
                  archived.length === 0
                    ? "Demandas marcadas como concluídas ficam verdes no quadro e, após 3 dias, são guardadas aqui automaticamente."
                    : "Ajuste a busca ou os filtros acima para encontrar a demanda."
                }
              />
            </Card>
          ) : (
            <Card padding="sm" className="flex flex-col">
              <p className="text-[13px] font-medium text-muted px-3 pt-2 pb-3">
                {filteredArchived.length === archived.length
                  ? `${archived.length} demanda${archived.length === 1 ? "" : "s"} concluída${archived.length === 1 ? "" : "s"}`
                  : `${filteredArchived.length} de ${archived.length} demandas concluídas`}
                <span className="text-muted-2"> · use a busca e os filtros acima para localizar</span>
              </p>
              {filteredArchived.map((card, i) => (
                <div key={card.id}>
                  {i > 0 && <DottedDivider />}
                  <div className="flex items-center gap-3 px-3 py-3.5 group">
                    <CheckCircle2 size={16} strokeWidth={2} className="text-success flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink truncate">{card.title}</p>
                      <p className="text-[11px] text-muted truncate">
                        {card.boardName} · {card.columnName}
                        {card.completedAt && ` · concluída em ${formatDate(card.completedAt)}`}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                      {card.demandType && (
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            color: card.demandType.color,
                            background: `color-mix(in srgb, ${card.demandType.color} 12%, transparent)`,
                          }}
                        >
                          {card.demandType.name}
                        </span>
                      )}
                      {card.client && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-ink max-w-36">
                          <span className="truncate">{card.client.name}</span>
                        </span>
                      )}
                      {card.project && (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-2 text-muted max-w-36"
                          title={card.project.name}
                        >
                          <Briefcase size={10} className="flex-shrink-0" />
                          <span className="truncate">{card.project.name}</span>
                        </span>
                      )}
                    </div>
                    {card.assignee && (
                      <span className="flex-shrink-0" title={card.assignee.name}>
                        <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={24} />
                      </span>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        title="Restaurar para o quadro"
                        onClick={() => handleRestoreArchived(card.id)}
                        className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <ArchiveRestore size={14} />
                      </button>
                      <button
                        type="button"
                        title="Excluir definitivamente"
                        onClick={() => handleDeleteArchived(card.id)}
                        className="p-2 rounded-full text-muted hover:text-danger hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <CardModal
        key={editingCard?.id ?? `new-${createNonce}`}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCardSubmit}
        onDelete={editingCard ? () => handleDeleteCard(editingCard.id) : undefined}
        onSendToApproval={handleSendToApproval}
        editing={editingCard}
        columns={boardColumns}
        defaultColumnId={defaultColumnId}
        clients={clients}
        projects={projects}
        users={users}
        demandTypes={demandTypes}
        onDemandTypesChange={setDemandTypes}
        submitting={submitting}
      />

      <SchedulePostModal
        open={scheduleModalOpen}
        card={scheduleModalCard}
        onClose={() => {
          setScheduleModalOpen(false);
          setScheduleModalCard(null);
        }}
        onSubmit={handleScheduleSubmit}
        onCancelSchedule={handleCancelSchedule}
        onPublishNow={handlePublishNow}
      />

      <DemandTypeManager
        open={typeManagerOpen}
        onClose={() => setTypeManagerOpen(false)}
        types={demandTypes}
        onTypesChange={setDemandTypes}
      />

      <BoardManager
        open={boardManagerOpen}
        onClose={() => setBoardManagerOpen(false)}
        boards={boards}
        onBoardsChange={handleBoardsChange}
        clients={clients}
      />
    </div>
  );
}
