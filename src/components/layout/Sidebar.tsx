"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FolderKanban,
  UserCog,
  Wallet,
  Columns3,
  ShieldCheck,
  LogOut,
  NotebookText,
  ListChecks,
  ClipboardCheck,
  TrendingUp,
  Trophy,
  History,
  UserCircle,
  MessagesSquare,
  MessageCircle,
  Shield,
  CalendarHeart,
  Handshake,
  Building2,
  Workflow,
  PiggyBank,
  UsersRound,
  Activity,
  Send,
  Settings2,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  FileText,
  Presentation,
  Wrench,
  FormInput,
  QrCode,
  Link2,
  Type,
  Clock,
  Heart,
  CalendarClock,
  CalendarCheck2,
  Download,
  FileSignature,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/cn";
import type { ModuleKey } from "@/lib/modules";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  moduleKey: ModuleKey | null;
  adminOnly?: boolean;
};
type NavGroup = {
  key: string;
  label: string | null;
  icon: typeof LayoutDashboard | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: "top",
    label: null,
    icon: null,
    items: [{ href: "/", label: "Início", icon: LayoutDashboard, moduleKey: null }],
  },
  {
    key: "clientes-projetos",
    label: "Clientes & Projetos",
    icon: Building2,
    items: [
      { href: "/clientes", label: "Clientes", icon: Users, moduleKey: "clientes" },
      { href: "/contratos", label: "Contratos", icon: FileSignature, moduleKey: "clientes" },
      { href: "/projetos", label: "Projetos", icon: FolderKanban, moduleKey: "projetos" },
      { href: "/servicos", label: "Serviços", icon: Briefcase, moduleKey: "servicos" },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    icon: Handshake,
    items: [
      { href: "/crm", label: "CRM", icon: Handshake, moduleKey: "crm" },
      { href: "/propostas", label: "Propostas", icon: FileText, moduleKey: "propostas" },
    ],
  },
  {
    key: "producao",
    label: "Produção",
    icon: Workflow,
    items: [
      { href: "/kanban", label: "Demandas", icon: Columns3, moduleKey: "kanban" },
      { href: "/agendamentos", label: "Agendamentos", icon: CalendarCheck2, moduleKey: "kanban" },
      { href: "/aprovacoes", label: "Aprovação", icon: ClipboardCheck, moduleKey: "aprovacoes" },
      { href: "/notas", label: "Notas", icon: NotebookText, moduleKey: "notas" },
      { href: "/checklist", label: "Checklist", icon: ListChecks, moduleKey: "checklist" },
    ],
  },
  {
    key: "desempenho",
    label: "Desempenho",
    icon: Activity,
    items: [
      { href: "/desempenho", label: "Desempenho", icon: TrendingUp, moduleKey: "desempenho" },
      { href: "/ferramentas/ranking-conteudo", label: "Ranking de Conteúdo", icon: Trophy, moduleKey: "ferramentas" },
      { href: "/ferramentas/horarios", label: "Horários", icon: CalendarClock, moduleKey: "ferramentas" },
    ],
  },
  {
    key: "ferramentas",
    label: "Ferramentas",
    icon: Wrench,
    items: [
      { href: "/ferramentas/formularios", label: "Formulários", icon: FormInput, moduleKey: "ferramentas" },
      { href: "/ferramentas/qrcode", label: "QR Code", icon: QrCode, moduleKey: "ferramentas" },
      { href: "/ferramentas/link-curto", label: "Link Curto", icon: Link2, moduleKey: "ferramentas" },
      { href: "/ferramentas/contador", label: "Caracteres", icon: Type, moduleKey: "ferramentas" },
      { href: "/ferramentas/roteiro", label: "Roteiro", icon: Clock, moduleKey: "ferramentas" },
      {
        href: "/datas-comemorativas",
        label: "Datas Comemorativas",
        icon: CalendarHeart,
        moduleKey: "datas-comemorativas",
      },
      { href: "/ferramentas/engajamento", label: "Engajamento", icon: Heart, moduleKey: "ferramentas" },
    ],
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: PiggyBank,
    items: [{ href: "/financeiro", label: "Financeiro", icon: Wallet, moduleKey: "financeiro" }],
  },
  {
    key: "equipe",
    label: "Equipe",
    icon: UsersRound,
    items: [
      { href: "/equipe", label: "Equipe", icon: UserCog, moduleKey: "equipe" },
      { href: "/squads", label: "Squads", icon: Shield, moduleKey: "squads" },
      { href: "/timesheet", label: "Timesheet", icon: Clock, moduleKey: "timesheet" },
    ],
  },
  {
    key: "comunicacao",
    label: "Comunicação",
    icon: Send,
    items: [
      { href: "/chat", label: "Chat", icon: MessagesSquare, moduleKey: "chat" },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle, moduleKey: "whatsapp" },
    ],
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: Settings2,
    items: [
      { href: "/configuracoes/perfil", label: "Perfil", icon: UserCircle, moduleKey: null },
      { href: "/usuarios", label: "Usuários", icon: ShieldCheck, moduleKey: "usuarios" },
      { href: "/configuracoes/integracoes", label: "Integrações", icon: Link2, moduleKey: null, adminOnly: true },
      { href: "/configuracoes/importar", label: "Importar", icon: Download, moduleKey: null, adminOnly: true },
      { href: "/configuracoes/contratos", label: "Modelos de Contrato", icon: FileText, moduleKey: null, adminOnly: true },
      { href: "/configuracoes/propostas", label: "Modelos de Proposta", icon: Presentation, moduleKey: null, adminOnly: true },
      { href: "/configuracoes/quadros", label: "Modelos de Quadro", icon: Columns3, moduleKey: null, adminOnly: true },
      { href: "/configuracoes/atividade", label: "Atividade", icon: History, moduleKey: null, adminOnly: true },
    ],
  },
];

export function Sidebar({
  userId: _userId,
  userName,
  role,
  allowedModules,
  initialTheme,
  initialSidebarStyle = "compact",
  mobileOpen = false,
  onNavigate,
  pendingContractsCount = 0,
}: {
  userId: string;
  userName: string;
  role: "ADMIN" | "MEMBER";
  allowedModules: ModuleKey[];
  initialTheme: "dark" | "light";
  initialSidebarStyle?: "compact" | "full";
  mobileOpen?: boolean;
  onNavigate?: () => void;
  pendingContractsCount?: number;
}) {
  const pathname = usePathname();
  const [style, setStyle] = useState<"compact" | "full">(initialSidebarStyle);
  const compact = style === "compact";

  function toggleStyle() {
    const next: "compact" | "full" = compact ? "full" : "compact";
    setStyle(next);
    document.cookie = `sidebar-style=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  function activeGroupKey(path: string) {
    const group = NAV_GROUPS.find((g) =>
      g.items.some((item) => (item.href === "/" ? path === "/" : path.startsWith(item.href))),
    );
    return group?.key ?? null;
  }

  const currentActiveGroup = activeGroupKey(pathname);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});

  function isGroupExpanded(key: string) {
    return groupOverrides[key] ?? key === currentActiveGroup;
  }

  function toggleGroup(key: string) {
    setGroupOverrides((prev) => ({ ...prev, [key]: !isGroupExpanded(key) }));
  }

  function renderNavItem(item: NavItem) {
    const Icon = item.icon;
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    const badge = item.href === "/contratos" && pendingContractsCount > 0 ? pendingContractsCount : null;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title={badge ? `${item.label} · ${badge} contrato(s) aguardando sua assinatura` : item.label}
        className={cn(
          "relative flex items-center gap-3 py-2.5 px-4 rounded-full text-sm transition-all duration-150",
          compact && "md:flex-col md:justify-center md:gap-1 md:w-[72px] md:px-1 md:py-2 md:rounded-2xl md:text-center",
          active
            ? "bg-accent text-black font-semibold shadow-sm shadow-accent/30"
            : cn(
                "font-medium text-muted hover:text-ink hover:bg-sidebar-2 hover:translate-x-0.5",
                compact && "md:hover:translate-x-0",
              ),
        )}
      >
        <span className={cn("relative flex-shrink-0", compact && "md:mx-auto")}>
          <Icon size={17} strokeWidth={active ? 2.2 : 1.9} />
          {badge && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {badge}
            </span>
          )}
        </span>
        <span className={cn(compact && "md:text-[10px] md:leading-tight md:line-clamp-2 md:font-medium")}>
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "w-64 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-screen",
        "fixed inset-y-0 left-0 z-50 transition-[transform,width] duration-200 md:sticky md:top-0 md:translate-x-0",
        compact ? "md:w-[88px]" : "md:w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className={cn("h-16 flex items-center border-b border-sidebar-border px-5", compact && "md:justify-center md:px-0")}>
        <div className={cn(compact && "md:hidden")}>
          <Logo href="/" onClick={onNavigate} />
        </div>
        {compact && (
          <div className="hidden md:block">
            <Logo href="/" onClick={onNavigate} compact />
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-0">
        <nav
          className={cn(
            "h-full overflow-y-auto overflow-x-hidden py-4 px-3 pb-8 flex flex-col gap-1",
            compact && "md:px-2 md:items-center",
          )}
        >
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) =>
                (!item.moduleKey || allowedModules.includes(item.moduleKey)) &&
                (!item.adminOnly || role === "ADMIN"),
            );
            if (visibleItems.length === 0) return null;

            if (!group.label) {
              return (
                <div key={group.key} className={cn("md:w-full flex flex-col", compact && "md:items-center")}>
                  <div className={cn("flex flex-col gap-1 md:w-full", compact && "md:items-center")}>
                    {visibleItems.map(renderNavItem)}
                  </div>
                </div>
              );
            }

            const GroupIcon = group.icon;
            const expanded = compact || isGroupExpanded(group.key);

            return (
              <div key={group.key} className={cn("md:w-full flex flex-col mt-4", compact && "md:items-center")}>
                {compact && <div className="hidden md:block h-px bg-sidebar-border mb-3 w-6" />}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={expanded}
                  className={cn(
                    "flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[11px] font-semibold text-sidebar-muted/80 hover:text-ink hover:bg-sidebar-2 transition-colors cursor-pointer",
                    compact && "md:hidden",
                  )}
                >
                  {GroupIcon && <GroupIcon size={13} strokeWidth={2.1} className="flex-shrink-0" />}
                  <span className="flex-1 text-left uppercase tracking-wide">{group.label}</span>
                  <ChevronDown
                    size={13}
                    strokeWidth={2.3}
                    className={cn("flex-shrink-0 transition-transform duration-200", !expanded && "-rotate-90")}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 md:w-full",
                    expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden md:w-full">
                    <div className={cn("flex flex-col gap-1 pt-1 md:w-full", compact && "md:items-center md:pt-0")}>
                      {visibleItems.map(renderNavItem)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-sidebar to-transparent" />
      </div>

      <div className={cn("hidden md:flex px-3 pt-2", compact ? "justify-center" : "justify-end")}>
        <button
          type="button"
          onClick={toggleStyle}
          title={compact ? "Usar menu tradicional" : "Usar menu reduzido"}
          className="text-sidebar-muted hover:text-accent transition-colors p-1.5 rounded-full hover:bg-sidebar-2 cursor-pointer"
        >
          {compact ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
      </div>

      <div className="p-3">
        <div className={cn("flex-col items-center gap-2", compact ? "hidden md:flex" : "hidden")}>
          <div
            title={userName}
            className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-black flex-shrink-0"
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <ThemeToggle initialTheme={initialTheme} />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="text-muted hover:text-accent transition-colors p-1.5 rounded-full hover:bg-sidebar-2 flex-shrink-0 cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>

        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-3xl bg-sidebar-2",
            compact && "md:hidden",
          )}
        >
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-black flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{userName}</p>
            <p className="text-xs text-muted">{role === "ADMIN" ? "Administrador" : "Membro"}</p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle initialTheme={initialTheme} />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sair"
              className="text-muted hover:text-accent transition-colors p-1.5 rounded-full hover:bg-sidebar-2 flex-shrink-0 cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
