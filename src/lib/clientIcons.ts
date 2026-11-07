import {
  Building2,
  ShoppingBag,
  Utensils,
  HeartPulse,
  Sparkles,
  Home,
  Briefcase,
  Camera,
  Dumbbell,
  GraduationCap,
  Car,
  Scale,
  Palette,
  Smartphone,
  Plane,
  PawPrint,
  Baby,
  Music,
  Gem,
  Leaf,
  Coffee,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CLIENT_ICONS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "building", label: "Corporativo", icon: Building2 },
  { key: "shopping", label: "Varejo", icon: ShoppingBag },
  { key: "food", label: "Alimentação", icon: Utensils },
  { key: "health", label: "Saúde", icon: HeartPulse },
  { key: "beauty", label: "Beleza/Estética", icon: Sparkles },
  { key: "realestate", label: "Imobiliário", icon: Home },
  { key: "consulting", label: "Consultoria", icon: Briefcase },
  { key: "media", label: "Fotografia/Mídia", icon: Camera },
  { key: "fitness", label: "Fitness", icon: Dumbbell },
  { key: "education", label: "Educação", icon: GraduationCap },
  { key: "auto", label: "Automotivo", icon: Car },
  { key: "legal", label: "Jurídico", icon: Scale },
  { key: "creative", label: "Design/Criativo", icon: Palette },
  { key: "tech", label: "Tecnologia", icon: Smartphone },
  { key: "travel", label: "Turismo", icon: Plane },
  { key: "pet", label: "Pet", icon: PawPrint },
  { key: "kids", label: "Infantil", icon: Baby },
  { key: "entertainment", label: "Entretenimento", icon: Music },
  { key: "luxury", label: "Joalheria/Luxo", icon: Gem },
  { key: "sustainability", label: "Sustentabilidade", icon: Leaf },
  { key: "cafe", label: "Cafeteria", icon: Coffee },
  { key: "services", label: "Serviços técnicos", icon: Wrench },
];

const CLIENT_ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  CLIENT_ICONS.map((c) => [c.key, c.icon]),
);

export function clientIconFor(key: string | null | undefined): LucideIcon {
  return (key && CLIENT_ICON_MAP[key]) || Building2;
}
