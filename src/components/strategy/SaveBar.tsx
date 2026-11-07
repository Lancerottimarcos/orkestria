"use client";

import { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconChip } from "@/components/ui/IconChip";

export function SaveBar({
  title,
  description,
  icon,
  saving,
  saved,
  onSave,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <Card padding="md" className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        {icon && (
          <IconChip tone="accent" size="lg">
            {icon}
          </IconChip>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {saved && !saving && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <Check size={13} /> Salvo
          </span>
        )}
        <Button onClick={onSave} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          Salvar
        </Button>
      </div>
    </Card>
  );
}
