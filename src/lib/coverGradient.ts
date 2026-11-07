export const COVER_GRADIENTS = [
  { key: "#a7b8f0", classes: "from-[#a7b8f0] via-[#c9b6e8] to-[#f0c9e0]" },
  { key: "#f5c9a0", classes: "from-[#f5c9a0] via-[#f0b0b8] to-[#e8a8d0]" },
  { key: "#f0d888", classes: "from-[#f0d888] via-[#f0b088] to-[#e89898]" },
  { key: "#b8a8e8", classes: "from-[#b8a8e8] via-[#c8a8d8] to-[#e8b0c0]" },
  { key: "#a0d8c0", classes: "from-[#a0d8c0] via-[#a8d0d8] to-[#b0c0e8]" },
  { key: "#e8e090", classes: "from-[#e8e090] via-[#c8d888] to-[#a0d0a0]" },
  { key: "#ffb870", classes: "from-[#ffb870] via-[#ff9f9f] to-[#f088c0]" },
  { key: "#88c8f0", classes: "from-[#88c8f0] via-[#98b8e8] to-[#b8a0e0]" },
  { key: "#ff9f9f", classes: "from-[#ff9f9f] via-[#f8b088] to-[#f0d078]" },
  { key: "#98e0b8", classes: "from-[#98e0b8] via-[#88d0c8] to-[#78b8e0]" },
  { key: "#d0a0f0", classes: "from-[#d0a0f0] via-[#e090c0] to-[#f0a0a0]" },
  { key: "#78c0d8", classes: "from-[#78c0d8] via-[#98c8b0] to-[#c0d888]" },
  { key: "#f0a0c0", classes: "from-[#f0a0c0] via-[#e8b0d0] to-[#d0b0e8]" },
  { key: "#c8d0a0", classes: "from-[#c8d0a0] via-[#d8c088] to-[#e8a878]" },
] as const;

export function coverGradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length].classes;
}

export function coverGradientByColor(color: string | null | undefined, fallbackId: string) {
  if (color) {
    const found = COVER_GRADIENTS.find((g) => g.key === color);
    if (found) return found.classes;
  }
  return coverGradientFor(fallbackId);
}
