import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { IconChip } from "@/components/ui/IconChip";

export function AuthShell({
  headline,
  description,
  bullets,
  highlight,
  children,
}: {
  headline: string;
  description: string;
  bullets: { icon: LucideIcon; label: string }[];
  highlight?: { icon: LucideIcon; title: string; subtitle: string };
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-app-glow p-4 sm:p-6 gap-6">
      <div className="hidden lg:flex lg:w-[46%] xl:w-1/2 relative overflow-hidden flex-col justify-between p-10 xl:p-12 bg-panel text-panel-ink rounded-card shadow-sm shadow-black/15">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(620px 460px at 10% -6%, color-mix(in srgb, var(--color-accent) 20%, transparent), transparent 65%), " +
              "radial-gradient(700px 560px at 104% 104%, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 70%)",
          }}
        />

        <div className="relative z-10 [&_svg]:text-panel-ink">
          <Logo size="lg" />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl xl:text-[44px] font-light tracking-tight text-panel-ink leading-[1.08]">
            {headline}
          </h2>
          <p className="text-sm text-panel-muted mt-5 leading-relaxed">{description}</p>

          <div className="flex flex-col mt-8">
            {bullets.map((b, i) => (
              <div key={b.label}>
                {i > 0 && <div className="border-t border-dotted border-panel-2" />}
                <div className="flex items-center gap-3.5 py-3">
                  <IconChip tone="accent" size="sm">
                    <b.icon size={15} strokeWidth={2} />
                  </IconChip>
                  <span className="text-sm font-medium text-panel-ink">{b.label}</span>
                </div>
              </div>
            ))}
          </div>

          {highlight && (
            <div className="mt-8 -rotate-1 bg-panel-2 rounded-3xl px-5 py-4 shadow-xl shadow-black/30 flex items-center gap-3.5 max-w-[22rem]">
              <IconChip tone="solid">
                <highlight.icon size={17} strokeWidth={2} />
              </IconChip>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-panel-ink leading-snug">{highlight.title}</p>
                <p className="text-xs text-panel-muted leading-snug mt-0.5">{highlight.subtitle}</p>
              </div>
            </div>
          )}
        </div>

        <p className="relative z-10 text-xs text-panel-muted">Orkestrya · Gestão de agências</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-0 sm:px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-accent/10 blur-[130px] lg:opacity-60" />
          <div className="hidden lg:block absolute bottom-[-12rem] right-[-8rem] w-[26rem] h-[26rem] rounded-full bg-accent-light/[0.06] blur-[120px]" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="flex lg:hidden justify-center mb-8">
            <Logo size="lg" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
