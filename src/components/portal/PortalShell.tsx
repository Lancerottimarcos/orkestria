"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ClipboardCheck, MessageCircle, Briefcase, BarChart3 } from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

const BASE_NAV_ITEMS = [
  { href: "/portal", label: "Aprovações", icon: ClipboardCheck },
  { href: "/portal/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/portal/mensagens", label: "Mensagens", icon: MessageCircle },
];
const SERVICOS_ITEM = { href: "/portal/servicos", label: "Serviços", icon: Briefcase };

export function PortalShell({
  clientName,
  clientAvatarUrl,
  initialTheme,
  isClientOwner,
  children,
}: {
  clientName: string;
  clientAvatarUrl?: string | null;
  initialTheme: "dark" | "light";
  isClientOwner: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const NAV_ITEMS = isClientOwner
    ? [BASE_NAV_ITEMS[0], SERVICOS_ITEM, ...BASE_NAV_ITEMS.slice(1)]
    : BASE_NAV_ITEMS;

  return (
    <div className="min-h-screen w-full flex flex-col bg-app-glow">
      <div className="sticky top-0 z-30 px-4 sm:px-6 pt-4 pb-2 bg-bg/75 backdrop-blur-md">
        <header className="h-14 flex items-center justify-between gap-3 px-3 sm:pl-6 sm:pr-3 bg-surface rounded-full shadow-sm shadow-black/10">
          <div className="flex items-center gap-6 min-w-0">
            <Logo href="/portal" />
            <nav className="hidden sm:flex items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors",
                      active ? "bg-ink text-bg" : "text-muted hover:text-ink hover:bg-surface-2",
                    )}
                  >
                    <item.icon size={14} /> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full bg-surface-2">
              <Avatar name={clientName} url={clientAvatarUrl} size={28} className="text-[11px]" />
              <span className="text-[13px] font-semibold text-ink truncate max-w-40">{clientName}</span>
            </span>
            <ThemeToggle initialTheme={initialTheme} />
            <button
              onClick={() => signOut({ callbackUrl: "/portal/login" })}
              title="Sair"
              aria-label="Sair"
              className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center text-muted hover:text-accent transition-colors rounded-full hover:bg-surface-2 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      </div>
      <nav className="sm:hidden flex items-center gap-1.5 px-4 py-2 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold transition-colors flex-shrink-0",
                active ? "bg-ink text-bg" : "text-muted bg-surface hover:text-ink",
              )}
            >
              <item.icon size={14} /> {item.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 min-w-0 w-full p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}
