export const COLUMN_COLOR_PRESETS = [
  "#ff9f1c",
  "#e14b4b",
  "#3fb56f",
  "#4b9fe1",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#14b8a6",
  "#6b7280",
];

export function getContrastText(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}
