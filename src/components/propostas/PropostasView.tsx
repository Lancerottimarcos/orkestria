"use client";

import { useState } from "react";
import { Plus, Link2, Check, Pencil, Trash2, ExternalLink, FileText, Calendar } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/IconChip";
import { BigStat, StatPillRow } from "@/components/ui/StatPills";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/format";
import { PROPOSAL_STATUS_LABELS } from "@/lib/labels";
import { copyToClipboard } from "@/lib/clipboard";
import { ProposalModal } from "./ProposalModal";
import { PROPOSAL_KIND_LABELS, type ProposalSummary, type Option, type OpportunityOption } from "./types";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

const STATUS_TONE: Record<string, "muted" | "accent" | "success" | "danger"> = {
  DRAFT: "muted",
  SENT: "accent",
  ACCEPTED: "success",
  REJECTED: "danger",
  CHANGES_REQUESTED: "accent",
};

export function PropostasView({
  clients,
  opportunities,
  initialProposals,
}: {
  clients: (Option & { avatarUrl: string | null })[];
  opportunities: OpportunityOption[];
  initialProposals: ProposalSummary[];
}) {
  const [proposals, setProposals] = useState(initialProposals);
  const { confirmDialog, alertDialog } = useConfirmDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/propostas");
    if (res.ok) setProposals(await res.json());
  }

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function copyLink(proposal: ProposalSummary) {
    const url = `${window.location.origin}/proposta/${proposal.token}`;
    copyToClipboard(url);
    setCopiedId(proposal.id);
    setTimeout(() => setCopiedId((id) => (id === proposal.id ? null : id)), 1800);
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Excluir esta proposta?", { confirmLabel: "Excluir" }))) return;
    const res = await fetch(`/api/propostas/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } else {
      const data = await res.json().catch(() => null);
      await alertDialog(data?.error || "Não foi possível excluir a proposta.");
    }
  }

  const openCount = proposals.filter((p) => p.status === "DRAFT" || p.status === "SENT").length;
  const acceptedProposals = proposals.filter((p) => p.status === "ACCEPTED");
  const acceptedValue = acceptedProposals.reduce((sum, p) => sum + p.total, 0);
  const rejectedCount = proposals.filter((p) => p.status === "REJECTED").length;

  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Propostas comerciais e orçamentos para clientes e leads."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Plus size={16} /> Nova proposta
          </Button>
        }
      />

      {proposals.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={<FileText size={20} />}
            title="Nenhuma proposta ainda"
            description="Crie a primeira proposta comercial ou orçamento para um cliente ou lead."
            action={
              <Button onClick={openCreate}>
                <Plus size={16} /> Nova proposta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Panel padding="lg" className="flex flex-col justify-between gap-10">
              <div className="flex items-start justify-between gap-4">
                <IconChip tone="panel" size="lg">
                  <FileText size={20} strokeWidth={1.8} />
                </IconChip>
                <span className="rounded-full bg-panel-2 px-3.5 py-1.5 text-[13px] text-panel-muted whitespace-nowrap">
                  {acceptedProposals.length} de {proposals.length} aceitas
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[34px] sm:text-[40px] font-light leading-none tracking-tight">
                  {formatCurrency(acceptedValue)}
                </span>
                <span className="text-sm text-panel-muted">Valor aceito</span>
              </div>
            </Panel>

            <Card padding="lg" className="flex flex-col justify-between gap-10">
              <BigStat
                value={proposals.length}
                label={proposals.length === 1 ? "proposta no total" : "propostas no total"}
              />
              <StatPillRow
                items={[
                  { label: "Em aberto", display: openCount, tone: "accent", weight: openCount },
                  { label: "Aceitas", display: acceptedProposals.length, tone: "dark", weight: acceptedProposals.length },
                  { label: "Recusadas", display: rejectedCount, tone: "hatch", weight: rejectedCount },
                ]}
              />
            </Card>
          </div>

          <Table>
            <Thead>
              <Th>Proposta</Th>
              <Th>Status</Th>
              <Th>Valor</Th>
              <Th>Válida até</Th>
              <Th className="text-right">Ações</Th>
            </Thead>
            <tbody>
              {proposals.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <IconChip size="sm">
                        <FileText size={14} />
                      </IconChip>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink truncate">{p.title}</p>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-2 flex-shrink-0">
                            {PROPOSAL_KIND_LABELS[p.kind]}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {p.client?.name ?? p.opportunity?.name ?? "Sem cliente vinculado"}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[p.status] ?? "muted"}>
                      {PROPOSAL_STATUS_LABELS[p.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-[15px] font-medium text-ink tabular-nums whitespace-nowrap">
                      {formatCurrency(p.total)}
                    </span>
                  </Td>
                  <Td className="text-muted">
                    {p.validUntil ? (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar size={13} /> {formatDate(p.validUntil)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyLink(p)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-accent bg-surface-2 hover:bg-surface-3 rounded-full px-3.5 py-2 whitespace-nowrap cursor-pointer transition-colors"
                        title="Copiar link"
                      >
                        {copiedId === p.id ? <Check size={13} className="text-success" /> : <Link2 size={13} />}
                        {copiedId === p.id ? "Copiado" : "Copiar link"}
                      </button>
                      <a
                        href={`/proposta/${p.token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 cursor-pointer transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        onClick={() => openEdit(p.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-accent hover:bg-surface-2 cursor-pointer transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <ProposalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        proposalId={editingId}
        clients={clients}
        opportunities={opportunities}
        onSaved={async () => {
          setModalOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}
