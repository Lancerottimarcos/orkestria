/**
 * Extrai uma cor dominante de uma imagem (data URL) pra sugerir como cor de
 * capa a partir do logo do cliente. Roda tudo no navegador via canvas - sem
 * chamada de rede.
 *
 * Não é só "a cor que mais aparece": um logo pequeno (tipo um símbolo fino
 * dentro de um círculo) tem muito mais pixel de borda antialiasada (a cor
 * da marca se misturando com o fundo branco) do que pixel da cor sólida em
 * si - contar só frequência faz a extração "achar" uma cor pastel/lavada
 * que não existe de verdade na marca. Por isso cada pixel pesa pela própria
 * saturação (quão longe do cinza ele está): pixel de borda misturado pesa
 * pouco, pixel de cor sólida e viva pesa muito - assim a cor de marca de
 * verdade (o azul-marinho ou o laranja, nunca um meio-termo entre os dois)
 * ganha mesmo sendo minoria em quantidade de pixels.
 */
export function extractDominantColor(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const size = 120;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        // Sem suavização: evita que o próprio redimensionamento borre ainda
        // mais os traços finos do logo antes da leitura dos pixels.
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<string, { weight: number; r: number; g: number; b: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 220) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max - min;
          const isNearWhite = min > 215;
          const isNearBlack = max < 24;
          if (isNearWhite || isNearBlack || saturation < 24) continue;

          // Quantização fina o bastante pra não confundir a cor sólida com
          // um pixel de borda ligeiramente mais claro/escuro dela mesma.
          const key = `${Math.round(r / 16)}-${Math.round(g / 16)}-${Math.round(b / 16)}`;
          const weight = saturation * saturation;
          const bucket = buckets.get(key);
          if (bucket) {
            bucket.weight += weight;
            bucket.r += r * weight;
            bucket.g += g * weight;
            bucket.b += b * weight;
          } else {
            buckets.set(key, { weight, r: r * weight, g: g * weight, b: b * weight });
          }
        }

        let best: { weight: number; r: number; g: number; b: number } | null = null;
        for (const bucket of buckets.values()) {
          if (!best || bucket.weight > best.weight) best = bucket;
        }
        if (!best) {
          resolve(null);
          return;
        }

        const r = Math.round(best.r / best.weight);
        const g = Math.round(best.g / best.weight);
        const b = Math.round(best.b / best.weight);
        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        resolve(hex);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
