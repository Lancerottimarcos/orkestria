"use client";

import { useEffect, useRef, useState } from "react";

/** Número que anima do valor anterior até o novo quando `value` muda. */
export function CountUp({ value, className }: { value: number | null; className?: string }) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevValue = useRef(value ?? 0);

  useEffect(() => {
    if (value == null) return;
    const from = prevValue.current;
    const to = value;
    prevValue.current = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const durationMs = 900;
    let raf: number;
    let start: number | null = null;

    function tick(timestamp: number) {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{value == null ? "-" : display.toLocaleString("pt-BR")}</span>;
}
