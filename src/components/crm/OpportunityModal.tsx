"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DottedDivider } from "@/components/ui/Dotted";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { salesOpportunitySchema, type SalesOpportunityFormValues, type SalesOpportunityInput } from "@/lib/schemas";
import { toDateInputValue } from "@/lib/format";
import type { StageData, OpportunityData, UserOption } from "./types";

const SOURCE_OPTIONS = ["Indicação", "Inbound", "Outbound", "Anúncio", "Evento", "Outro"];

export function OpportunityModal({
  open,
  onClose,
  onSubmit,
  onDelete,
  editing,
  stages,
  defaultStageId,
  users,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SalesOpportunityInput) => void;
  onDelete?: () => void;
  editing: OpportunityData | null;
  stages: StageData[];
  defaultStageId: string;
  users: UserOption[];
  submitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SalesOpportunityFormValues, unknown, SalesOpportunityInput>({
    resolver: zodResolver(salesOpportunitySchema),
    defaultValues: { stageId: defaultStageId },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? "",
      contactName: editing?.contactName ?? "",
      email: editing?.email ?? "",
      phone: editing?.phone ?? "",
      document: editing?.document ?? "",
      address: editing?.address ?? "",
      monthlyValue: editing?.monthlyValue ?? undefined,
      setupValue: editing?.setupValue ?? undefined,
      source: editing?.source ?? "",
      notes: editing?.notes ?? "",
      expectedCloseDate: toDateInputValue(editing?.expectedCloseDate),
      lostReason: editing?.lostReason ?? "",
      stageId: editing?.stageId ?? defaultStageId,
      responsibleId: editing?.responsible?.id ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultStageId]);

  const selectedStage = stages.find((s) => s.id === watch("stageId"));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar" : "Nova"}
      titleAccent="oportunidade"
      width="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Nome do lead ou empresa" error={errors.name?.message}>
            <Input {...register("name")} placeholder="Ex: Loja Aurora" autoFocus />
          </Field>
          <Field label="Etapa">
            <Select {...register("stageId")}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Contato">
            <Input {...register("contactName")} placeholder="Nome de quem decide" />
          </Field>
          <Field label="Responsável">
            <Select {...register("responsibleId")}>
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id} data-avatar-name={u.name} data-avatar-url={u.avatarUrl}>{u.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Telefone">
            <Input {...register("phone")} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Email">
            <Input {...register("email")} placeholder="contato@empresa.com" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Documento (CNPJ/CPF)" hint="Opcional - preenche o contrato automaticamente">
            <Input {...register("document")} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Endereço" hint="Opcional - preenche o contrato automaticamente">
            <Input {...register("address")} placeholder="Rua, número, cidade" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Valor mensal (R$)">
            <Input type="number" step="0.01" {...register("monthlyValue")} placeholder="0" />
          </Field>
          <Field label="Valor de setup (R$)">
            <Input type="number" step="0.01" {...register("setupValue")} placeholder="0" />
          </Field>
          <Field label="Previsão de fechamento">
            <Input type="date" {...register("expectedCloseDate")} />
          </Field>
        </div>

        <Field label="Origem">
          <Select {...register("source")}>
            <option value="">Selecione</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>

        <Field label="Notas">
          <Textarea {...register("notes")} placeholder="Contexto, próximos passos, objeções..." />
        </Field>

        {selectedStage?.isLost && (
          <Field label="Motivo da perda">
            <Textarea {...register("lostReason")} placeholder="Por que essa venda não foi fechada?" />
          </Field>
        )}

        <DottedDivider className="mt-1" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {editing && onDelete ? (
            <Button type="button" variant="danger" onClick={onDelete}>
              <Trash2 size={14} /> Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2.5">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
