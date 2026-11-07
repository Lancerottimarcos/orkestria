"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { IconChip } from "@/components/ui/IconChip";
import { DottedDivider } from "@/components/ui/Dotted";
import { formatDateTime } from "@/lib/format";
import type { Submission } from "./types";

export function FormSubmissionsModal({
  open,
  onClose,
  formId,
  formTitle,
}: {
  open: boolean;
  onClose: () => void;
  formId: string | null;
  formTitle: string;
}) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !formId) return;
    setLoading(true);
    fetch(`/api/formularios/${formId}/submissions`)
      .then((r) => r.json())
      .then(setSubmissions)
      .finally(() => setLoading(false));
  }, [open, formId]);

  return (
    <Modal open={open} onClose={onClose} title="Respostas" titleAccent={formTitle} width="lg">
      {loading ? (
        <p className="text-sm text-muted-2 py-8 text-center">Carregando...</p>
      ) : submissions.length === 0 ? (
        <p className="text-sm text-muted-2 py-8 text-center">Nenhuma resposta recebida ainda.</p>
      ) : (
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {submissions.map((s) => (
            <div key={s.id} className="bg-surface-2 rounded-card p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <IconChip tone="dark" size="sm">
                  <User size={14} strokeWidth={2} />
                </IconChip>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{s.respondentName || "Anônimo"}</p>
                  {s.respondentEmail && <p className="text-xs text-muted truncate">{s.respondentEmail}</p>}
                </div>
                <p className="text-xs text-muted-2 flex-shrink-0">{formatDateTime(s.createdAt)}</p>
              </div>

              <div className="flex flex-col gap-3">
                {s.responses.map((r, i) => (
                  <div key={i}>
                    {i > 0 && <DottedDivider className="mb-3" />}
                    <p className="text-[13px] font-medium text-muted">{r.field.label}</p>
                    <p className="text-sm text-ink whitespace-pre-wrap mt-0.5">{r.value || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
