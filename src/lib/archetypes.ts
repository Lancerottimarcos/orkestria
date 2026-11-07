import { Sun, Users, Shield, HeartHandshake, Compass, Flame, Heart, Palette, Smile, BookOpen, Wand2, Crown } from "lucide-react";

export const ARCHETYPES = [
  { key: "INOCENTE", label: "Inocente", desc: "Otimismo, simplicidade, confiança", color: "#7dd3fc", icon: Sun },
  { key: "ORFAO", label: "Cara Comum", desc: "Pertencimento, empatia, realismo", color: "#a3a3a3", icon: Users },
  { key: "HEROI", label: "Herói", desc: "Superação, coragem, conquista", color: "#e14b4b", icon: Shield },
  { key: "CUIDADOR", label: "Cuidador", desc: "Cuidado, generosidade, proteção", color: "#f0abfc", icon: HeartHandshake },
  { key: "EXPLORADOR", label: "Explorador", desc: "Liberdade, descoberta, autenticidade", color: "#4b9fe1", icon: Compass },
  { key: "REBELDE", label: "Rebelde", desc: "Ruptura, ousadia, revolução", color: "#1c1c1c", icon: Flame },
  { key: "AMANTE", label: "Amante", desc: "Paixão, conexão, sensorialidade", color: "#ec4899", icon: Heart },
  { key: "CRIADOR", label: "Criador", desc: "Inovação, expressão, originalidade", color: "#a855f7", icon: Palette },
  { key: "BOBO", label: "Bobo da Corte", desc: "Humor, leveza, espontaneidade", color: "#eab308", icon: Smile },
  { key: "SABIO", label: "Sábio", desc: "Conhecimento, clareza, verdade", color: "#14b8a6", icon: BookOpen },
  { key: "MAGO", label: "Mago", desc: "Transformação, visão, poder pessoal", color: "#7c3aed", icon: Wand2 },
  { key: "GOVERNANTE", label: "Governante", desc: "Autoridade, controle, excelência", color: "#ff9f1c", icon: Crown },
] as const;

export type ArchetypeKey = (typeof ARCHETYPES)[number]["key"];

export function archetypeLabel(key: string | null | undefined): string {
  return ARCHETYPES.find((a) => a.key === key)?.label ?? "";
}

export function archetypeColor(key: string | null | undefined): string {
  return ARCHETYPES.find((a) => a.key === key)?.color ?? "#9a9a9a";
}
