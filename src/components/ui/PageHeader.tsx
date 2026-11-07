import { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
      <div>
        <h1 className="text-[32px] sm:text-[40px] font-light tracking-tight leading-[1.05] text-ink">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted mt-2">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 pb-1">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-surface-2 border border-dotted border-border-2 flex items-center justify-center text-muted">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description && (
          <p className="text-xs text-muted mt-1.5 max-w-xs">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
