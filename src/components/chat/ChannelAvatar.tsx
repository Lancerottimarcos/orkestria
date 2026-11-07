"use client";

import { Building2, Users2, MessagesSquare } from "lucide-react";
import { coverGradientByColor } from "@/lib/coverGradient";
import { cn } from "@/lib/cn";

type Kind = "SECTOR" | "GROUP" | "CLIENT" | "DM";

const KIND_ICON: Record<Kind, typeof Building2> = {
  SECTOR: Building2,
  GROUP: Users2,
  CLIENT: MessagesSquare,
  DM: Users2,
};

export function ChannelAvatar({
  id,
  name,
  avatarUrl,
  color,
  kind,
  size = 44,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color?: string | null;
  kind: Kind;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  if (kind === "GROUP" || kind === "DM") {
    const Icon = KIND_ICON[kind];
    return (
      <div
        className={cn(
          "rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 font-bold text-black/70",
          coverGradientByColor(color, id),
        )}
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.4) }}
      >
        {kind === "DM" ? name.charAt(0).toUpperCase() : <Icon size={Math.round(size * 0.42)} />}
      </div>
    );
  }

  const Icon = KIND_ICON[kind];
  return (
    <div
      className="rounded-full bg-surface-3 bg-hatch flex items-center justify-center flex-shrink-0 text-muted"
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.42)} />
    </div>
  );
}
