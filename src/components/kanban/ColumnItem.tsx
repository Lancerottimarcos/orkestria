"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Trash2, GripVertical, Zap } from "lucide-react";
import { CardItem, type CardImageMode } from "./CardItem";
import { PowerUpsManager } from "./PowerUpsManager";
import type { KanbanColumnData, KanbanCardData, Option, UserOption, DemandTypeOption } from "./types";
import { COLUMN_COLOR_PRESETS, getContrastText } from "@/lib/colors";
import { cn } from "@/lib/cn";

export function ColumnItem({
  column,
  allColumns,
  users,
  demandTypes,
  imageMode,
  onAddCard,
  onCardClick,
  onScheduleCard,
  onUnmarkCompleteCard,
  onDeleteCard,
  onDeleteColumn,
  onRenameColumn,
  onColorChange,
  matchesFilter,
  filterActive,
  isDragging,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
  currentUserId,
}: {
  column: KanbanColumnData;
  allColumns: Option[];
  users: UserOption[];
  demandTypes: DemandTypeOption[];
  imageMode: CardImageMode;
  onAddCard: (columnId: string) => void;
  onCardClick: (card: KanbanCardData) => void;
  onScheduleCard: (card: KanbanCardData) => void;
  onUnmarkCompleteCard: (card: KanbanCardData) => void;
  onDeleteCard: (cardId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onColorChange: (columnId: string, color: string) => void;
  matchesFilter: (card: KanbanCardData) => boolean;
  filterActive: boolean;
  isDragging: boolean;
  onColumnDragStart: () => void;
  onColumnDragOver: (e: React.DragEvent) => void;
  onColumnDrop: () => void;
  onColumnDragEnd: () => void;
  currentUserId?: string;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(column.name);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [powerUpsOpen, setPowerUpsOpen] = useState(false);
  const visibleCount = column.cards.filter(matchesFilter).length;
  const hasColor = Boolean(column.color);
  const color = column.color || "var(--color-accent)";
  const ctaTextColor = hasColor ? getContrastText(column.color!) : "#000000";

  function commitName() {
    setEditingName(false);
    if (name.trim() && name !== column.name) {
      onRenameColumn(column.id, name.trim());
    } else {
      setName(column.name);
    }
  }

  return (
    <div
      className={cn(
        "w-80 flex-shrink-0 flex flex-col max-h-full transition-opacity group/column",
        isDragging && "opacity-40",
      )}
      onDragOver={onColumnDragOver}
      onDrop={onColumnDrop}
    >
      <div
        className="flex items-center gap-2 px-1.5 py-1.5 cursor-grab active:cursor-grabbing flex-shrink-0"
        draggable
        onDragStart={onColumnDragStart}
        onDragEnd={onColumnDragEnd}
      >
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPickerOpen((v) => !v);
            }}
            title="Cor da coluna"
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-pointer"
            style={{ background: color }}
          />
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="absolute top-5 left-0 z-50 bg-surface rounded-2xl p-3 shadow-2xl shadow-black/20 grid grid-cols-5 gap-1.5 w-44">
                {COLUMN_COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onColorChange(column.id, c);
                      setPickerOpen(false);
                    }}
                    className="w-6 h-6 rounded-full cursor-pointer ring-1 ring-border-2 hover:scale-110 transition-transform"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => e.key === "Enter" && commitName()}
            className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-ink min-w-0"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-left text-[15px] font-bold text-ink truncate cursor-text min-w-0"
          >
            {column.name}
          </button>
        )}
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border-2 text-muted flex-shrink-0 tabular-nums">
          {filterActive ? `${visibleCount}/${column.cards.length}` : column.cards.length}
        </span>

        <div className="ml-auto flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPowerUpsOpen(true);
            }}
            title="Power-ups (automações)"
            className="relative w-6 h-6 rounded-full flex items-center justify-center text-muted-2 hover:text-accent hover:bg-surface-2 transition-all cursor-pointer opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100"
          >
            <Zap size={13} />
            {column.automationCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-black text-[9px] font-bold min-w-[14px] h-3.5 px-0.5 rounded-full flex items-center justify-center">
                {column.automationCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onDeleteColumn(column.id)}
            title="Remover coluna"
            className="w-6 h-6 rounded-full flex items-center justify-center text-muted-2 hover:text-danger hover:bg-surface-2 transition-all cursor-pointer opacity-0 group-hover/column:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 size={13} />
          </button>
          <GripVertical size={14} className="text-muted-2 flex-shrink-0" />
        </div>
      </div>

      <div className="px-0.5 pt-1.5 pb-0.5 flex-shrink-0">
        <button
          onClick={() => onAddCard(column.id)}
          className="w-full py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer shadow-sm shadow-black/5"
          style={{ background: color, color: ctaTextColor }}
        >
          <Plus size={14} /> Nova demanda
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto py-3 px-0.5 flex flex-col gap-3 min-h-24">
        <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onSchedule={() => onScheduleCard(card)}
              onUnmarkComplete={() => onUnmarkCompleteCard(card)}
              onDelete={() => onDeleteCard(card.id)}
              dimmed={filterActive && !matchesFilter(card)}
              imageMode={imageMode}
              allColumns={allColumns}
              users={users}
              demandTypes={demandTypes}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>
        {column.cards.length === 0 && (
          <div className="rounded-3xl bg-hatch border border-dotted border-border-2 py-6">
            <p className="text-xs text-muted-2 text-center">Nenhuma demanda</p>
          </div>
        )}
      </div>

      <PowerUpsManager
        open={powerUpsOpen}
        onClose={() => setPowerUpsOpen(false)}
        columnId={column.id}
        columns={allColumns}
        users={users}
        demandTypes={demandTypes}
      />
    </div>
  );
}
