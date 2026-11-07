import { Great_Vibes, Dancing_Script, Mrs_Saint_Delafield, Marck_Script } from "next/font/google";

const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"] });
const dancingScript = Dancing_Script({ weight: "600", subsets: ["latin"] });
const mrsSaintDelafield = Mrs_Saint_Delafield({ weight: "400", subsets: ["latin"] });
const marckScript = Marck_Script({ weight: "400", subsets: ["latin"] });

/**
 * Estilos de assinatura digital oferecidos na tela do contrato - o cliente
 * escolhe um e a chave fica salva em ContractedService.signerFont, pra
 * assinatura sempre reaparecer do jeito que foi feita. As quatro opções são
 * scripts de assinatura de verdade (traço manuscrito), não fontes
 * decorativas genéricas.
 */
export const SIGNATURE_FONTS = [
  { key: "elegante", label: "Elegante", className: greatVibes.className },
  { key: "fluida", label: "Fluida", className: dancingScript.className },
  { key: "manuscrita", label: "Manuscrita", className: mrsSaintDelafield.className },
  { key: "descontraida", label: "Descontraída", className: marckScript.className },
] as const;

export type SignatureFontKey = (typeof SIGNATURE_FONTS)[number]["key"];

export function signatureFontClass(key: string | null | undefined) {
  return SIGNATURE_FONTS.find((f) => f.key === key)?.className ?? SIGNATURE_FONTS[0].className;
}
