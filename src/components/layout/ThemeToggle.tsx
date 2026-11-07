"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className="text-muted hover:text-accent transition-colors p-1.5 rounded-md hover:bg-surface-2 flex-shrink-0 cursor-pointer"
    >
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
