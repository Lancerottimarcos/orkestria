"use client";

import { useState } from "react";
import { UserSearch, Images, Stethoscope, Swords, Compass, Frame } from "lucide-react";
import { cn } from "@/lib/cn";
import { PersonaPanel } from "./PersonaPanel";
import { MoodboardPanel } from "./MoodboardPanel";
import { DiagnosisPanel } from "./DiagnosisPanel";
import { CompetitorsPanel } from "./CompetitorsPanel";
import { PositioningPanel } from "./PositioningPanel";
import { KeyVisualPanel } from "./KeyVisualPanel";

const MODULES = [
  { key: "persona", label: "Persona", desc: "Dores, desejos e objetivos", icon: UserSearch },
  { key: "moodboard", label: "Moodboard", desc: "Inspirações e referências soltas", icon: Images },
  { key: "diagnostico", label: "Raio-X do Perfil", desc: "Diagnóstico do Instagram", icon: Stethoscope },
  { key: "concorrencia", label: "Concorrentes", desc: "Mapa da concorrência", icon: Swords },
  { key: "posicionamento", label: "Posicionamento", desc: "Voz, tom e arquétipo", icon: Compass },
  { key: "key-visual", label: "Key Visual", desc: "Padrão visual de referência", icon: Frame },
] as const;

type ModuleKey = (typeof MODULES)[number]["key"];

export function EstrategiaView({ clientId }: { clientId: string }) {
  const [active, setActive] = useState<ModuleKey>("persona");

  return (
    <div className="flex flex-col lg:flex-row gap-5 items-start">
      <div className="flex lg:flex-col gap-2.5 overflow-x-auto lg:overflow-visible w-full lg:w-64 xl:w-72 flex-shrink-0 pb-1 lg:pb-0 lg:sticky lg:top-5">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = active === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={cn(
                "flex items-center gap-3 text-left rounded-full pl-2.5 pr-6 py-2.5 shadow-sm shadow-black/5 transition-colors flex-shrink-0 lg:w-full cursor-pointer",
                isActive ? "bg-accent text-black" : "bg-surface text-ink hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  isActive ? "bg-black/15" : "bg-surface-2 text-muted",
                )}
              >
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{m.label}</span>
                <span className={cn("block text-[11px] truncate", isActive ? "text-black/70" : "text-muted")}>
                  {m.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-w-0 w-full">
        {active === "persona" && <PersonaPanel clientId={clientId} />}
        {active === "moodboard" && <MoodboardPanel clientId={clientId} />}
        {active === "diagnostico" && <DiagnosisPanel clientId={clientId} />}
        {active === "concorrencia" && <CompetitorsPanel clientId={clientId} />}
        {active === "posicionamento" && <PositioningPanel clientId={clientId} />}
        {active === "key-visual" && <KeyVisualPanel clientId={clientId} />}
      </div>
    </div>
  );
}
