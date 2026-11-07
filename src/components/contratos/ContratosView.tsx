"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  PenLine,
  ExternalLink,
  Calendar,
  RefreshCw,
  FileText,
  Star,
  Settings2,
  Sparkles,
  UserRound,
  Copy,
  Check,
} from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, Panel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { IconChip } from "@/components/ui/IconChip";
import { Avatar } from "@/components/ui/Avatar";
import { BigStat, StatPillRow } from "@/components/ui/StatPills";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { FilterBar, FilterTabs } from "@/components/ui/FilterBar";
import { formatCurrency, formatDate, PERIOD_LABELS, type ContractedServicePeriod } from "@/lib/format";
import { signatureFontClass } from "@/lib/signatureFonts";
import { copyToClipboard } from "@/lib/clipboard";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

export type ContractRow = {
  id: string;
  name: string;
  value: number;
  period: ContractedServicePeriod;
  startDate: string;
  renewalDate: string | null;
  renewalSoon: boolean;
  renewalOverdue: boolean;
  hasContract: boolean;
  signedAt: string | null;
  signerName: string | null;
  signerFont: string | null;
  agencySignedAt: string | null;
  agencySignerName: string | null;
  createdAt: string;
  client: { id: string; name: string; avatarUrl: string | null };
  proposalToken: string | null;
  proposalTitle: string | null;
};

export type TemplateRow = { id: string; name: string; updatedAt: string; isDefault: boolean };

type ContractStatus = "sem-contrato" | "aguardando-cliente" | "aguardando-agencia" | "ativo";

function statusOf(c: ContractRow): ContractStatus {
  if (!c.hasContract) return "sem-contrato";
  if (!c.signedAt) return "aguardando-cliente";
  if (!c.agencySignedAt) return "aguardando-agencia";
  return "ativo";
}

const STATUS_META: Record<ContractStatus, { label: string; tone: "neutral" | "accent" | "success" | "danger" | "muted" }> = {
  "sem-contrato": { label: "Sem contrato", tone: "muted" },
  "aguardando-cliente": { label: "Aguardando cliente", tone: "accent" },
  "aguardando-agencia": { label: "Precisa da sua assinatura", tone: "danger" },
  ativo: { label: "Ativo", tone: "success" },
};

type Tab = "assinar" | "cliente" | "ativos" | "todos" | "modelos";

const TABS: { key: Tab; label: string }[] = [
  { key: "assinar", label: "Precisam de assinatura" },
  { key: "cliente", label: "Aguardando cliente" },
  { key: "ativos", label: "Ativos" },
  { key: "todos", label: "Todos" },
  { key: "modelos", label: "Modelos" },
];

/**
 * Central de contratos - a agência vê num lugar só o que precisa assinar, o
 * que o cliente ainda não assinou, o que está ativo (com renovação próxima
 * em destaque) e os modelos. Assina por aqui mesmo, sem ir na ficha do
 * cliente.
 */
export function ContratosView({ initialContracts, templates }: { initialContracts: ContractRow[]; templates: TemplateRow[] }) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [tab, setTab] = useState<Tab>(() => (initialContracts.some((c) => statusOf(c) === "aguardando-agencia") ? "assinar" : "todos"));
  const [signingId, setSigningId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { confirmDialog, alertDialog } = useConfirmDialog();

  const counts = useMemo(() => {
    const byStatus: Record<ContractStatus, number> = { "sem-contrato": 0, "aguardando-cliente": 0, "aguardando-agencia": 0, ativo: 0 };
    let activeValue = 0;
    let renewalSoon = 0;
    for (const c of contracts) {
      const s = statusOf(c);
      byStatus[s] += 1;
      if (s === "ativo") {
        activeValue += c.value;
        if (c.renewalSoon) renewalSoon += 1;
      }
    }
    return { byStatus, activeValue, renewalSoon };
  }, [contracts]);

  const visible = contracts.filter((c) => {
    const s = statusOf(c);
    if (tab === "assinar") return s === "aguardando-agencia";
    if (tab === "cliente") return s === "aguardando-cliente";
    if (tab === "ativos") return s === "ativo";
    return true;
  });

  async function handleAgencySign(c: ContractRow) {
    const ok = await confirmDialog(`Assinar o contrato de "${c.name}" com ${c.client.name} em nome da agência?`, {
      confirmLabel: "Assinar contrato",
    });
    if (!ok) return;
    setSigningId(c.id);
    try {
      const res = await fetch(`/api/clientes/${c.client.id}/servicos-contratados/${c.id}/assinar-agencia`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        await alertDialog(json.error ?? "Não foi possível assinar o contrato");
        return;
      }
      const updated = await res.json();
      setContracts((list) =>
        list.map((item) =>
          item.id === c.id
            ? { ...item, agencySignedAt: updated.agencySignedAt, agencySignerName: updated.agencySignerName ?? null }
            : item,
        ),
      );
      // Badge de pendências da sidebar vem do layout (server) - recarrega pra ele cair junto.
      router.refresh();
    } finally {
      setSigningId(null);
    }
  }

  async function handleCopyLink(c: ContractRow) {
    if (!c.proposalToken) return;
    await copyToClipboard(`${window.location.origin}/contrato/${c.proposalToken}`);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const pendingAgency = counts.byStatus["aguardando-agencia"];

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Tudo que foi contratado, quem ainda precisa assinar, o que está ativo e os modelos"
        actions={
          <Link href="/configuracoes/contratos">
            <Button variant="ghost">
              <Settings2 size={14} /> Gerenciar modelos
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Panel padding="lg" className="flex flex-col justify-between gap-10">
            <div className="flex items-start justify-between gap-4">
              <IconChip tone="panel" size="lg">
                <FileSignature size={20} strokeWidth={1.8} />
              </IconChip>
              <span className="rounded-full bg-panel-2 px-3.5 py-1.5 text-[13px] text-panel-muted whitespace-nowrap">
                {counts.byStatus.ativo} {counts.byStatus.ativo === 1 ? "contrato ativo" : "contratos ativos"}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[34px] sm:text-[40px] font-light leading-none tracking-tight">
                {formatCurrency(counts.activeValue)}
              </span>
              <span className="text-sm text-panel-muted">Valor contratado ativo</span>
            </div>
          </Panel>

          <Card padding="lg" className="flex flex-col justify-between gap-10">
            <div className="flex items-start justify-between gap-4">
              <BigStat value={contracts.length} label={contracts.length === 1 ? "contrato no total" : "contratos no total"} />
              {counts.renewalSoon > 0 && (
                <Badge tone="accent" icon={<RefreshCw size={11} />}>
                  {counts.renewalSoon} {counts.renewalSoon === 1 ? "renova em 30 dias" : "renovam em 30 dias"}
                </Badge>
              )}
            </div>
            <StatPillRow
              items={[
                { label: "Precisam de assinatura", display: pendingAgency, tone: "accent", weight: pendingAgency },
                { label: "Aguardando cliente", display: counts.byStatus["aguardando-cliente"], tone: "hatch", weight: counts.byStatus["aguardando-cliente"] },
                { label: "Ativos", display: counts.byStatus.ativo, tone: "dark", weight: counts.byStatus.ativo },
              ]}
            />
          </Card>
        </div>

        <FilterBar>
          <div className="min-w-0 max-w-full overflow-x-auto">
            <FilterTabs tabs={TABS} value={tab} onChange={setTab} />
          </div>
        </FilterBar>

        {tab === "modelos" ? (
          <TemplatesGrid templates={templates} />
        ) : visible.length === 0 ? (
          <Card padding="none">
            <EmptyState
              icon={<FileSignature size={20} strokeWidth={1.8} />}
              title={
                tab === "assinar"
                  ? "Nenhum contrato esperando a sua assinatura"
                  : tab === "cliente"
                    ? "Nenhum contrato esperando o cliente"
                    : tab === "ativos"
                      ? "Nenhum contrato ativo ainda"
                      : "Nenhum contrato ainda"
              }
              description={
                tab === "todos"
                  ? "Os contratos nascem automaticamente quando o cliente aceita uma proposta, ou manualmente na ficha do cliente."
                  : "Quando aparecer algo aqui, você resolve direto desta tela."
              }
            />
          </Card>
        ) : (
          <Table>
            <Thead>
              <Th>Contrato</Th>
              <Th>Status</Th>
              <Th>Valor</Th>
              <Th>Vigência</Th>
              <Th className="text-right">Ações</Th>
            </Thead>
            <tbody>
              {visible.map((c) => {
                const status = statusOf(c);
                const meta = STATUS_META[status];
                return (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={c.client.name} url={c.client.avatarUrl} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink truncate">{c.name}</p>
                          <Link href={`/clientes/${c.client.id}`} className="text-xs text-muted mt-0.5 truncate hover:text-accent transition-colors inline-flex items-center gap-1">
                            <UserRound size={11} /> {c.client.name}
                          </Link>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {status === "ativo" && c.signerName && (
                          <span className={cn("text-[18px] text-ink leading-none", signatureFontClass(c.signerFont))}>{c.signerName}</span>
                        )}
                        {status === "aguardando-agencia" && c.signedAt && (
                          <span className="text-[11px] text-muted">Cliente assinou em {formatDate(c.signedAt)}</span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span className="text-[15px] font-medium text-ink tabular-nums whitespace-nowrap">{formatCurrency(c.value)}</span>
                      <span className="block text-[11px] text-muted-2">{PERIOD_LABELS[c.period]}</span>
                    </Td>
                    <Td className="text-muted">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs">
                          <Calendar size={12} /> {formatDate(c.startDate)}
                        </span>
                        {c.renewalDate && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 whitespace-nowrap text-xs",
                              c.renewalOverdue ? "text-danger font-semibold" : c.renewalSoon ? "text-accent font-semibold" : "",
                            )}
                          >
                            <RefreshCw size={12} /> {c.renewalOverdue ? "Vencido em" : "Renova em"} {formatDate(c.renewalDate)}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        {status === "aguardando-agencia" && (
                          <Button size="sm" variant="success" onClick={() => handleAgencySign(c)} disabled={signingId === c.id}>
                            <PenLine size={13} /> {signingId === c.id ? "Assinando..." : "Assinar"}
                          </Button>
                        )}
                        {c.proposalToken && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyLink(c)}
                              title="Copiar link do contrato"
                              className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
                            >
                              {copiedId === c.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                            <a
                              href={`/contrato/${c.proposalToken}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir contrato"
                              className="p-2 rounded-full text-muted hover:text-accent hover:bg-surface-2 transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}

function TemplatesGrid({ templates }: { templates: TemplateRow[] }) {
  if (templates.length === 0) {
    return (
      <Card padding="none">
        <EmptyState
          icon={<FileText size={20} strokeWidth={1.8} />}
          title="Nenhum modelo de contrato ainda"
          description="Gere um modelo guiado em segundos ou crie um do zero."
          action={
            <Link href="/configuracoes/contratos">
              <Button size="sm">
                <Sparkles size={14} /> Ir para modelos
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Link key={template.id} href={`/configuracoes/contratos/${template.id}`}>
          <Card padding="none" className="overflow-hidden h-full hover:border-accent/40 transition-colors">
            <div className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                  <FileText size={18} strokeWidth={1.8} />
                </span>
                {template.isDefault && (
                  <Badge tone="accent" icon={<Star size={11} />}>
                    Padrão
                  </Badge>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{template.name}</p>
                <p className="text-xs text-muted-2 mt-0.5">Atualizado em {formatDate(template.updatedAt)}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
