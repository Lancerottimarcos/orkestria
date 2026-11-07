/**
 * Paleta de cores sólidas pra capa do cliente. Cada cliente sem cor definida
 * recebe uma dessas de forma determinística (hash do id), pra nunca ficar
 * sem capa e sempre repetir a mesma cor pro mesmo cliente.
 */
export const CLIENT_COVER_PRESETS = [
  "#ff6b35",
  "#e14b4b",
  "#d6249f",
  "#a855f7",
  "#6366f1",
  "#4b9fe1",
  "#14b8a6",
  "#3fb56f",
  "#84cc16",
  "#eab308",
  "#f97316",
  "#64748b",
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function clientCoverFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CLIENT_COVER_PRESETS[hash % CLIENT_COVER_PRESETS.length];
}

/** Resolve a cor sólida da capa: usa a cor salva se for um hex válido, senão cai numa cor determinística pro id. */
export function resolveClientCoverColor(color: string | null | undefined, fallbackId: string): string {
  if (color && HEX_RE.test(color)) return color;
  return clientCoverFor(fallbackId);
}
