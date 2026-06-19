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
      className="relative flex-shrink-0 w-[50px] h-[26px] rounded-full overflow-hidden transition-colors duration-200"
      style={{ background: isDark ? "#1c1c1c" : "#d4cdd1" }}
    >
      {/* Thumb */}
      <span
        className="absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full shadow-sm transition-transform duration-200 flex items-center justify-center"
        style={{
          background: isDark ? "#EEE5E9" : "#000",
          transform: isDark ? "translateX(24px)" : "translateX(0px)",
        }}
      >
        {isDark
          ? <Moon size={10} strokeWidth={2} className="text-[#000]" />
          : <Sun size={10} strokeWidth={2} className="text-[#EEE5E9]" />
        }
      </span>
    </button>
  );
}
