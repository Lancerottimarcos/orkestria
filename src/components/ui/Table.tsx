import { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface rounded-card shadow-sm shadow-black/5 overflow-hidden px-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Thead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-dotted border-border-2">{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-left text-[13px] font-medium text-muted px-4 py-4",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b border-dotted border-border last:border-0 hover:bg-surface-2/50 transition-colors",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-4 align-middle", className)}>{children}</td>;
}
