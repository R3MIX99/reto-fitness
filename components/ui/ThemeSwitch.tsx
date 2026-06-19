"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[52px] h-[28px] rounded-full bg-[#1c1c1c]" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="relative w-[52px] h-[28px] rounded-full transition-colors duration-200"
      style={{ background: isDark ? "#1c1c1c" : "#e0d9dd" }}
    >
      {/* Track icons */}
      <Sun size={12} strokeWidth={1.5} className="absolute left-[7px] top-1/2 -translate-y-1/2 text-warm opacity-60" />
      <Moon size={12} strokeWidth={1.5} className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[var(--color-muted)] opacity-60" />

      {/* Thumb */}
      <span
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-[var(--color-fg)] shadow-sm transition-transform duration-200"
        style={{ transform: isDark ? "translateX(25px)" : "translateX(3px)" }}
      />
    </button>
  );
}
