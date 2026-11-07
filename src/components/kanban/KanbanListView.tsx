"use client";

import { Calendar, Briefcase, Clock, CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/format";
import { PRIORITY_LABELS, POST_STATUS_LABELS } from "@/lib/labels";
import type { KanbanCardData, KanbanColumnData } from "./types";

const PRIORITY_TONE: Record<string, "accent" | "muted" | "danger"> = {
  HIGH: "danger",
  MEDIUM: "accent",
  LOW: "muted",
};

const POST_ICON: Record<string, typeof Clock> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  CHANGES_REQUESTED: MessageSquareWarning,
  REJECTED: XCircle,
};
const POST_TONE: Record<string, "muted" | "success" | "danger"> = {
  PENDING: "muted",
  APPROVED: "success",
  CHANGES_REQUESTED: "danger",
  REJECTED: "danger",
};

export function KanbanListView({
  columns,
  onCardClick,
}: {
  columns: KanbanColumnData[];
  onCardClick: (card: KanbanCardData) => void;
}) {
  const rows = columns.flatMap((col) => col.cards.map((card) => ({ card, column: col })));

  if (rows.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<Briefcase size={20} strokeWidth={1.8} />}
          title="Nenhuma demanda encontrada"
          description="Ajuste os filtros ou crie uma demanda na visão de quadro para vê-la aqui."
        />
      </Card>
    );
  }

  return (
    <Table>
      <Thead>
        <Th>Título</Th>
        <Th>Coluna</Th>
        <Th>Cliente</Th>
        <Th>Prioridade</Th>
        <Th>Prazo</Th>
        <Th>Responsável</Th>
        <Th>Aprovação</Th>
      </Thead>
      <tbody>
        {rows.map(({ card, column }) => {
          const PostIcon = card.post ? POST_ICON[card.post.status] : null;
          return (
          <Tr key={card.id} className="cursor-pointer" onClick={() => onCardClick(card)}>
            <Td className="font-semibold text-ink">{card.title}</Td>
            <Td>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink bg-surface-2 px-3 py-1.5 rounded-full">
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: column.color || "var(--color-accent)" }}
                />
                {column.name}
              </span>
            </Td>
            <Td className="text-muted">{card.client?.name ?? "-"}</Td>
            <Td>
              <Badge tone={PRIORITY_TONE[card.priority]}>{PRIORITY_LABELS[card.priority]}</Badge>
            </Td>
            <Td className="text-muted">
              {card.dueDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(card.dueDate)}
                </span>
              ) : (
                "-"
              )}
            </Td>
            <Td className="text-muted">
              {card.assignee ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={card.assignee.name} url={card.assignee.avatarUrl} size={24} />
                  {card.assignee.name}
                </span>
              ) : (
                "-"
              )}
            </Td>
            <Td>
              {card.post && PostIcon ? (
                <Badge tone={POST_TONE[card.post.status]} icon={<PostIcon size={11} />}>
                  {POST_STATUS_LABELS[card.post.status]}
                </Badge>
              ) : (
                <span className="text-muted-2">-</span>
              )}
            </Td>
          </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
