"use client";

import { useEffect, useState } from "react";
import { Zap, Plus, Trash2, Pencil, X as XIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { IconChip } from "@/components/ui/IconChip";
import { cn } from "@/lib/cn";
import type { Option, UserOption, DemandTypeOption } from "./types";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

type Trigger = "ENTER_COLUMN" | "TYPE_CHANGED_TO" | "CARD_IDLE" | "DUE_DATE_APPROACHING";
type Action =
  | "ASSIGN_MEMBER"
  | "MARK_DUE_DATE_DONE"
  | "ADD_COMMENT"
  | "ADD_CHECKLIST"
  | "SET_DEMAND_TYPE"
  | "MOVE_TO_COLUMN"
  | "SET_URGENT"
  | "CLEAR_URGENT"
  | "SORT_BY_DUE_DATE"
  | "PROMPT_SCHEDULE"
  | "AI_DRAFT_CAPTION";

type AutomationRow = {
  id: string;
  trigger: Trigger;
  action: Action;
  active: boolean;
  triggerDemandType: DemandTypeOption | null;
  triggerThresholdDays: number | null;
  assignee: Option | null;
  mentionUser: Option | null;
  setDemandType: DemandTypeOption | null;
  moveToColumn: Option | null;
  commentText: string | null;
  checklistTitle: string | null;
  checklistItems: string | null;
  column?: Option | null;
};

const TRIGGER_LABELS: Record<Trigger, string> = {
  ENTER_COLUMN: "Quando o cartão entrar nesta coluna",
  TYPE_CHANGED_TO: "Quando o tipo mudar para...",
  CARD_IDLE: "Quando o cartão ficar parado por X dias",
  DUE_DATE_APPROACHING: "Quando faltar X dias pro prazo",
};

const ACTION_LABELS: Record<Action, string> = {
  ASSIGN_MEMBER: "Atribuir um membro automaticamente",
  MARK_DUE_DATE_DONE: "Marcar prazo como concluído",
  ADD_COMMENT: "Adicionar comentário automático",
  ADD_CHECKLIST: "Adicionar checklist automática",
  SET_DEMAND_TYPE: "Atualizar tipo de demanda",
  MOVE_TO_COLUMN: "Mover cartão para outra coluna",
  SET_URGENT: "Marcar como urgente (prioridade alta)",
  CLEAR_URGENT: "Limpar urgência (prioridade média)",
  SORT_BY_DUE_DATE: "Ordenar a coluna por prazo",
  PROMPT_SCHEDULE: "Abrir agendamento de publicação (rede, data e horário)",
  AI_DRAFT_CAPTION: "Gerar rascunho de legenda com IA (comentário automático)",
};

function summarize(rule: AutomationRow, cardScoped: boolean): string {
  // Power-up "deste card" fica preso à coluna em que foi criado - se o card
  // já mudou de coluna, o gatilho não dispara mais; mostra qual é essa
  // coluna em vez de um "nesta coluna" genérico que ficaria ambíguo.
  // CARD_IDLE/DUE_DATE_APPROACHING "deste card" também ficam presos à coluna
  // em que foram criados (mesma trava de ENTER_COLUMN, ver comentário acima)
  // - sem mostrar a coluna aqui, um power-up morto (card já mudou de coluna)
  // parecia idêntico a um ativo, exatamente o que esse texto existe pra evitar.
  const columnSuffix = cardScoped && rule.column ? ` (em "${rule.column.name}")` : "";
  const trigger = rule.trigger === "TYPE_CHANGED_TO"
    ? `Quando o tipo virar "${rule.triggerDemandType?.name ?? "?"}"`
    : rule.trigger === "CARD_IDLE"
      ? `Quando ficar parado por ${rule.triggerThresholdDays ?? "?"} dia(s)${columnSuffix}`
      : rule.trigger === "DUE_DATE_APPROACHING"
        ? `Quando faltar ${rule.triggerThresholdDays ?? "?"} dia(s) pro prazo${columnSuffix}`
        : cardScoped && rule.column
          ? `Quando o cartão entrar em "${rule.column.name}"`
          : TRIGGER_LABELS.ENTER_COLUMN;

  let action = ACTION_LABELS[rule.action];
  if (rule.action === "ASSIGN_MEMBER" && rule.assignee) action += `: ${rule.assignee.name}`;
  if (rule.action === "SET_DEMAND_TYPE" && rule.setDemandType) action += `: ${rule.setDemandType.name}`;
  if (rule.action === "MOVE_TO_COLUMN" && rule.moveToColumn) action += `: ${rule.moveToColumn.name}`;
  if (rule.action === "ADD_COMMENT" && rule.commentText) action += `: "${rule.commentText}"`;
  if (rule.action === "ADD_CHECKLIST" && rule.checklistTitle) action += `: ${rule.checklistTitle}`;

  return `${trigger} → ${action}`;
}

const emptyForm = {
  trigger: "ENTER_COLUMN" as Trigger,
  action: "ASSIGN_MEMBER" as Action,
  triggerDemandTypeId: "",
  triggerThresholdDays: "3",
  assigneeId: "",
  commentText: "",
  mentionUserId: "",
  checklistTitle: "",
  checklistItemsText: "",
  setDemandTypeId: "",
  moveToColumnId: "",
};

export function PowerUpsManager({
  open,
  onClose,
  columnId,
  cardId,
  columns,
  users,
  demandTypes,
}: {
  open: boolean;
  onClose: () => void;
  columnId: string;
  cardId?: string;
  columns: Option[];
  users: UserOption[];
  demandTypes: DemandTypeOption[];
}) {
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { confirmDialog } = useConfirmDialog();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const basePath = cardId ? `/api/kanban/cards/${cardId}/automations` : `/api/kanban/columns/${columnId}/automations`;

  useEffect(() => {
    if (!open) return;
    fetch(basePath)
      .then((r) => r.json())
      .then((data) => setAutomations(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, columnId, cardId]);

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setCreating(true);
  }

  function startEdit(rule: AutomationRow) {
    setForm({
      trigger: rule.trigger,
      action: rule.action,
      triggerDemandTypeId: rule.triggerDemandType?.id ?? "",
      triggerThresholdDays: rule.triggerThresholdDays != null ? String(rule.triggerThresholdDays) : "3",
      assigneeId: rule.assignee?.id ?? "",
      commentText: rule.commentText ?? "",
      mentionUserId: rule.mentionUser?.id ?? "",
      checklistTitle: rule.checklistTitle ?? "",
      checklistItemsText: rule.checklistItems ? (JSON.parse(rule.checklistItems) as string[]).join("\n") : "",
      setDemandTypeId: rule.setDemandType?.id ?? "",
      moveToColumnId: rule.moveToColumn?.id ?? "",
    });
    setEditingId(rule.id);
    setCreating(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        trigger: form.trigger,
        action: form.action,
        triggerDemandTypeId: form.triggerDemandTypeId,
        triggerThresholdDays: form.triggerThresholdDays,
        assigneeId: form.assigneeId,
        commentText: form.commentText,
        mentionUserId: form.mentionUserId,
        checklistTitle: form.checklistTitle,
        checklistItems: JSON.stringify(
          form.checklistItemsText.split("\n").map((s) => s.trim()).filter(Boolean),
        ),
        setDemandTypeId: form.setDemandTypeId,
        moveToColumnId: form.moveToColumnId,
      };
      const url = editingId ? `${basePath}/${editingId}` : basePath;
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        setAutomations((prev) =>
          editingId ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved],
        );
        setCreating(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(rule: AutomationRow) {
    setAutomations((prev) => prev.map((a) => (a.id === rule.id ? { ...a, active: !a.active } : a)));
    await fetch(`${basePath}/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
  }

  async function handleDelete(ruleId: string) {
    if (!(await confirmDialog("Remover este power-up?", { confirmLabel: "Remover" }))) return;
    const res = await fetch(`${basePath}/${ruleId}`, { method: "DELETE" });
    if (res.ok) setAutomations((prev) => prev.filter((a) => a.id !== ruleId));
  }

  const needsAssignee = form.action === "ASSIGN_MEMBER";
  const needsComment = form.action === "ADD_COMMENT";
  const needsChecklist = form.action === "ADD_CHECKLIST";
  const needsSetType = form.action === "SET_DEMAND_TYPE";
  const needsMoveColumn = form.action === "MOVE_TO_COLUMN";

  return (
    <Modal open={open} onClose={onClose} title="Power-ups" titleAccent={cardId ? "deste card" : "da coluna"} width="md">
      {creating ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconChip size="sm" tone="accent">
                <Zap size={14} strokeWidth={2} />
              </IconChip>
              <p className="text-base font-semibold text-ink">{editingId ? "Editar power-up" : "Novo power-up"}</p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-accent hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <XIcon size={16} />
            </button>
          </div>

          <Field label="Gatilho">
            <Select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value as Trigger }))}>
              <option value="ENTER_COLUMN">{TRIGGER_LABELS.ENTER_COLUMN}</option>
              <option value="TYPE_CHANGED_TO">{TRIGGER_LABELS.TYPE_CHANGED_TO}</option>
              <option value="CARD_IDLE">{TRIGGER_LABELS.CARD_IDLE}</option>
              <option value="DUE_DATE_APPROACHING">{TRIGGER_LABELS.DUE_DATE_APPROACHING}</option>
            </Select>
          </Field>

          {(form.trigger === "CARD_IDLE" || form.trigger === "DUE_DATE_APPROACHING") && (
            <Field label={form.trigger === "CARD_IDLE" ? "Dias parado" : "Dias de antecedência"}>
              <Input
                type="number"
                min="1"
                max="365"
                value={form.triggerThresholdDays}
                onChange={(e) => setForm((f) => ({ ...f, triggerThresholdDays: e.target.value }))}
              />
            </Field>
          )}

          {form.trigger === "TYPE_CHANGED_TO" && (
            <Field label="Tipo de demanda">
              <Select
                value={form.triggerDemandTypeId}
                onChange={(e) => setForm((f) => ({ ...f, triggerDemandTypeId: e.target.value }))}
              >
                <option value="">Selecione...</option>
                {demandTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Ação">
            <Select value={form.action} onChange={(e) => setForm((f) => ({ ...f, action: e.target.value as Action }))}>
              {(Object.keys(ACTION_LABELS) as Action[]).map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </Select>
          </Field>

          {needsAssignee && (
            <Field label="Membro">
              <Select value={form.assigneeId} onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}>
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} data-avatar-name={u.name} data-avatar-url={u.avatarUrl}>{u.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {needsComment && (
            <>
              <Field label="Texto do comentário">
                <Textarea
                  value={form.commentText}
                  onChange={(e) => setForm((f) => ({ ...f, commentText: e.target.value }))}
                  placeholder="Ex: Verificar ortografia e link"
                />
              </Field>
              <Field label="Mencionar" hint="Opcional">
                <Select value={form.mentionUserId} onChange={(e) => setForm((f) => ({ ...f, mentionUserId: e.target.value }))}>
                  <option value="">Ninguém</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} data-avatar-name={u.name} data-avatar-url={u.avatarUrl}>{u.name}</option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {needsChecklist && (
            <>
              <Field label="Título da checklist">
                <Input
                  value={form.checklistTitle}
                  onChange={(e) => setForm((f) => ({ ...f, checklistTitle: e.target.value }))}
                  placeholder="Ex: Itens para revisão"
                />
              </Field>
              <Field label="Itens" hint="Um item por linha">
                <Textarea
                  value={form.checklistItemsText}
                  onChange={(e) => setForm((f) => ({ ...f, checklistItemsText: e.target.value }))}
                  placeholder={"Revisar ortografia\nConferir link\nAprovar com cliente"}
                />
              </Field>
            </>
          )}

          {needsSetType && (
            <Field label="Novo tipo de demanda">
              <Select value={form.setDemandTypeId} onChange={(e) => setForm((f) => ({ ...f, setDemandTypeId: e.target.value }))}>
                <option value="">Selecione...</option>
                {demandTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
          )}

          {needsMoveColumn && (
            <Field label="Coluna de destino">
              <Select value={form.moveToColumnId} onChange={(e) => setForm((f) => ({ ...f, moveToColumnId: e.target.value }))}>
                <option value="">Selecione...</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <p className="text-xs text-muted mt-1.5">
                Move o card direto pra essa coluna, mas não dispara os power-ups de "Ao entrar na coluna" cadastrados nela -
                se quiser encadear, monte a próxima ação num power-up separado nessa mesma coluna de destino.
              </p>
            </Field>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto -mx-1 px-1">
            {automations.length === 0 && (
              <div className="rounded-3xl bg-hatch border border-dotted border-border-2 py-8">
                <p className="text-xs text-muted-2 text-center">
                  Nenhum power-up configurado {cardId ? "neste card" : "nesta coluna"} ainda.
                </p>
              </div>
            )}
            {automations.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "group flex items-start gap-3 px-3.5 py-3 rounded-3xl bg-surface-2 transition-opacity",
                  !rule.active && "opacity-50",
                )}
              >
                <IconChip size="sm" tone="accent" className="mt-0.5">
                  <Zap size={13} strokeWidth={2} />
                </IconChip>
                <p className="flex-1 text-xs text-ink leading-snug pt-1">{summarize(rule, Boolean(cardId))}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(rule)}
                    title={rule.active ? "Desativar" : "Ativar"}
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer",
                      rule.active ? "text-success bg-success/10" : "text-muted bg-surface-3",
                    )}
                  >
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {rule.active ? "Ativo" : "Inativo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(rule)}
                    title="Editar power-up"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-accent transition-opacity p-1 cursor-pointer"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    title="Remover power-up"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted hover:text-danger transition-opacity p-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" size="sm" onClick={startCreate}>
            <Plus size={14} /> Novo power-up
          </Button>
        </div>
      )}
    </Modal>
  );
}
