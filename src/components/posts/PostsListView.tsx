"use client";

import { ImagePlus } from "lucide-react";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/format";
import { POST_STATUS_LABELS } from "@/lib/labels";
import type { PostRow } from "./PostsView";

type Status = PostRow["status"];

const STATUS_TONE: Record<Status, "muted" | "success" | "danger"> = {
  PENDING: "muted",
  APPROVED: "success",
  CHANGES_REQUESTED: "danger",
  REJECTED: "danger",
};

export function PostsListView({
  posts,
  onRowClick,
}: {
  posts: PostRow[];
  onRowClick: (post: PostRow) => void;
}) {
  if (posts.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<ImagePlus size={20} />}
          title="Nenhum post encontrado"
          description="Ajuste os filtros ou envie um novo post."
        />
      </Card>
    );
  }

  return (
    <Table>
      <Thead>
        <Th></Th>
        <Th>Título</Th>
        <Th>Tipo</Th>
        <Th>Cliente</Th>
        <Th>Projeto</Th>
        <Th>Status</Th>
        <Th>Agendado para</Th>
        <Th>Criado em</Th>
      </Thead>
      <tbody>
        {posts.map((post) => {
          const cover = post.attachments[0];
          return (
            <Tr key={post.id} className="cursor-pointer" onClick={() => onRowClick(post)}>
              <Td className="w-14">
                {cover?.type === "VIDEO" ? (
                  <video src={cover.url} className="w-10 h-10 rounded-full object-cover" muted />
                ) : cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.url} alt={post.title} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-hatch border border-dotted border-border-2 flex items-center justify-center text-muted-2">
                    <ImagePlus size={14} strokeWidth={1.8} />
                  </div>
                )}
              </Td>
              <Td className="font-semibold text-ink">{post.title}</Td>
              <Td>
                {post.demandType ? (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border"
                    style={{
                      color: post.demandType.color,
                      borderColor: `color-mix(in srgb, ${post.demandType.color} 40%, transparent)`,
                    }}
                  >
                    {post.demandType.name}
                  </span>
                ) : (
                  <span className="text-muted-2">-</span>
                )}
              </Td>
              <Td className="text-muted">{post.client.name}</Td>
              <Td className="text-muted">{post.project?.name ?? <span className="text-muted-2">-</span>}</Td>
              <Td>
                <Badge tone={STATUS_TONE[post.status]}>{POST_STATUS_LABELS[post.status]}</Badge>
              </Td>
              <Td className="text-muted whitespace-nowrap">
                {post.scheduledDate ? formatDate(post.scheduledDate) : <span className="text-muted-2">-</span>}
              </Td>
              <Td className="text-muted whitespace-nowrap">{formatDate(post.createdAt)}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
