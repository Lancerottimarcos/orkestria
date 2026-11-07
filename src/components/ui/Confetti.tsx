"use client";

import { useEffect, useState } from "react";

const COLORS = ["#ff9f1c", "#3fb56f", "#3b82f6", "#a78bfa", "#eab308", "#f472b6"];

type Piece = {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotate: number;
  width: number;
  height: number;
};

/** Chuva de confete full-screen - incremente `trigger` (ex: contador de cliques) pra disparar uma nova explosão. */
export function Confetti({ trigger }: { trigger: number }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger === 0) return;
    // Math.random() é impuro por natureza - só pode rodar aqui dentro do
    // efeito (nunca direto no corpo do componente), disparado pela mudança
    // de `trigger`, não é um "reset de estado derivado" evitável.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPieces(
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.35,
        duration: 1.9 + Math.random() * 1.3,
        rotate: Math.random() * 360,
        width: 6 + Math.random() * 6,
        height: 8 + Math.random() * 8,
      })),
    );
    const timeout = setTimeout(() => setPieces([]), 3400);
    return () => clearTimeout(timeout);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: 0,
            width: p.width,
            height: p.height,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
