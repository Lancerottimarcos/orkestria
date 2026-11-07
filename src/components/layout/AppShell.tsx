"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Logo } from "./Logo";
import type { ModuleKey } from "@/lib/modules";

export function AppShell({
  userId,
  userName,
  role,
  allowedModules,
  initialTheme,
  initialSidebarStyle = "compact",
  pendingContractsCount = 0,
  children,
}: {
  userId: string;
  userName: string;
  role: "ADMIN" | "MEMBER";
  allowedModules: ModuleKey[];
  initialTheme: "dark" | "light";
  initialSidebarStyle?: "compact" | "full";
  pendingContractsCount?: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        userId={userId}
        userName={userName}
        role={role}
        allowedModules={allowedModules}
        initialTheme={initialTheme}
        initialSidebarStyle={initialSidebarStyle}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
        pendingContractsCount={pendingContractsCount}
      />

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col bg-app-glow">
        <div className="md:hidden h-16 flex items-center gap-3 px-4 border-b border-border bg-surface sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted hover:text-accent p-1.5 -ml-1.5 rounded-full hover:bg-surface-2 transition-colors cursor-pointer"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <Logo href="/" />
        </div>
        <main className="flex-1 min-w-0 p-4 sm:p-7 md:p-9">{children}</main>
      </div>
    </div>
  );
}
