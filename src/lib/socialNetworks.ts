import type { SocialNetwork } from "@/components/kanban/types";

export const SOCIAL_NETWORKS: { key: SocialNetwork; label: string; short: string; color: string }[] = [
  { key: "INSTAGRAM", label: "Instagram", short: "IG", color: "#d6249f" },
  { key: "FACEBOOK", label: "Facebook", short: "FB", color: "#1877f2" },
  { key: "TIKTOK", label: "TikTok", short: "TT", color: "#fe2c55" },
  { key: "YOUTUBE", label: "YouTube", short: "YT", color: "#ff0000" },
  { key: "LINKEDIN", label: "LinkedIn", short: "IN", color: "#0a66c2" },
  { key: "THREADS", label: "Threads", short: "TH", color: "#000000" },
];

export const SOCIAL_NETWORK_LABELS: Record<SocialNetwork, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  LINKEDIN: "LinkedIn",
  THREADS: "Threads",
};

export const SOCIAL_NETWORK_COLORS: Record<SocialNetwork, string> = {
  INSTAGRAM: "#d6249f",
  FACEBOOK: "#1877f2",
  TIKTOK: "#fe2c55",
  YOUTUBE: "#ff0000",
  LINKEDIN: "#0a66c2",
  THREADS: "#000000",
};

/** Degradê de marca pra usar no fundo de badges/ícones (só onde faz sentido mostrar o gradiente, não em chips pequenos de texto). */
export const SOCIAL_NETWORK_GRADIENTS: Partial<Record<SocialNetwork, string>> = {
  INSTAGRAM: "linear-gradient(135deg, #fd5949 0%, #d6249f 60%, #a52d9e 100%)",
};

export const SOCIAL_NETWORK_SHORT: Record<SocialNetwork, string> = {
  INSTAGRAM: "IG",
  FACEBOOK: "FB",
  TIKTOK: "TT",
  YOUTUBE: "YT",
  LINKEDIN: "IN",
  THREADS: "TH",
};

/**
 * O TikTok não tem uma "cor de marca" pra usar em selo/chip/botão - o uso
 * correto do logo deles fora de contexto colorido é preto no tema claro e
 * branco no escuro (não a cor de destaque #fe2c55, que é só uma das cores
 * do efeito de sobreposição do logo completo). Qualquer lugar que renderiza
 * o "shape" da rede (selo redondo, botão do seletor, chip cheio) deve
 * checar isso antes de aplicar SOCIAL_NETWORK_COLORS/SOCIAL_NETWORK_GRADIENTS.
 */
export function isMonoNetwork(network: SocialNetwork): boolean {
  return network === "TIKTOK" || network === "THREADS";
}

/** Fundo pra usar num "shape" da rede (selo/botão/chip cheio) - hex sólido, degradê, ou null quando a rede é monocromática (usar as classes bg-ink/text-bg no lugar). */
export function networkShapeBackground(network: SocialNetwork): string | null {
  if (isMonoNetwork(network)) return null;
  return SOCIAL_NETWORK_GRADIENTS[network] ?? SOCIAL_NETWORK_COLORS[network];
}
