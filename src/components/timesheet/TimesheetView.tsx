"use client";

import { useEffect, useState } from "react";
import { Clock, UserRound, Building2 } from "lucide-react";
import { FilterBar, FilterSelect, FilterClearButton } from "@/components/ui/FilterBar";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { StatPillRow } from "@/components/ui/StatPills";
import { EmptyState } from "@/components/ui/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/format";

type Entry = {
  id: string;
  minutes: number;
  date: string;
  note: string | null;
  user: { id: string; name: string; avatarUrl: string | null };
  card: { id: string; title: string; client: { id: string; name: string } | null };
};

function hours(minutes: number) {
  return (minutes / 60).toFixed(1).replace(/\.0$/, "");
}

export function TimesheetView({ users, clients }: { users: { id: string; name: string }[]; clients: { id: string; name: string }[] }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    // "loading" só cobre a primeira carga - trocar filtro depois só
    // atualiza a tabela quando a resposta chega, sem re-mostrar spinner.
    fetch(`/api/timesheet?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      });
  }, [userId, clientId, from, to]);

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const hasFilters = !!(userId || clientId || from || to);
  const entriesLabel = `${entries.length} ${entries.length === 1 ? "apontamento" : "apontamentos"}`;

  return (
    <div>
      <FilterBar>
        <FilterSelect icon={UserRound} value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Todo mundo</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </FilterSelect>
        <FilterSelect icon={Building2} value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </FilterSelect>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 px-4 rounded-full bg-surface border border-border shadow-sm shadow-black/5 text-sm text-ink outline-none focus:border-accent transition-colors"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-11 px-4 rounded-full bg-surface border border-border shadow-sm shadow-black/5 text-sm text-ink outline-none focus:border-accent transition-colors"
        />
        {hasFilters && (
          <FilterClearButton
            onClick={() => {
              setUserId("");
              setClientId("");
              setFrom("");
              setTo("");
            }}
          />
        )}
      </FilterBar>

      {loading ? (
        <Card padding="none">
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-surface-2 border border-dotted border-border-2 flex items-center justify-center text-muted">
              <Clock size={20} strokeWidth={1.8} className="animate-pulse" />
            </div>
            <p className="text-sm text-muted">Carregando apontamentos...</p>
          </div>
        </Card>
      ) : entries.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={<Clock size={20} strokeWidth={1.8} />} title="Nenhum apontamento ainda" description="Aponte horas direto no card do Kanban." />
        </Card>
      ) : (
        <>
          <StatPillRow
            className="mb-6"
            items={[
              {
                label: "Total de horas",
                tone: "accent",
                weight: Math.max(totalMinutes, 1),
                display: `${hours(totalMinutes)}h`,
              },
              {
                label: "Apontamentos",
                tone: "dark",
                weight: Math.max(entries.length, 1),
                display: entriesLabel,
              },
            ]}
          />
          <Table>
            <Thead>
              <Th>Membro</Th>
              <Th>Card</Th>
              <Th>Cliente</Th>
              <Th>Data</Th>
              <Th>Horas</Th>
              <Th>Nota</Th>
            </Thead>
            <tbody>
              {entries.map((entry) => (
                <Tr key={entry.id}>
                  <Td>
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <Avatar name={entry.user.name} url={entry.user.avatarUrl} size={22} className="flex-shrink-0" />
                      <span className="truncate">{entry.user.name}</span>
                    </span>
                  </Td>
                  <Td className="text-muted truncate max-w-48">{entry.card.title}</Td>
                  <Td className="text-muted truncate max-w-40">{entry.card.client?.name ?? "-"}</Td>
                  <Td className="text-muted tabular-nums whitespace-nowrap">{formatDate(entry.date)}</Td>
                  <Td className="tabular-nums font-medium text-ink whitespace-nowrap">{hours(entry.minutes)}h</Td>
                  <Td className="text-muted-2 truncate max-w-40">{entry.note ?? "-"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
