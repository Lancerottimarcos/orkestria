import { cn } from "@/lib/cn";

export function Avatar({
  name,
  url,
  size = 20,
  className,
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn("rounded-full object-cover flex-shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-surface-3 border border-border flex items-center justify-center font-bold text-ink flex-shrink-0",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.42) }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
