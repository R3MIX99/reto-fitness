"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

// Rutas donde se oculta la navegación (páginas de pantalla completa)
const FULLSCREEN_PATTERNS = ["/titulo/"];

export function BottomNavConditional() {
  const pathname = usePathname();
  const isFullscreen = FULLSCREEN_PATTERNS.some((p) => pathname.includes(p));

  if (isFullscreen) return null;

  return (
    <>
      {/* Fade sobre el contenido antes del nav */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 h-[90px] z-20"
        style={{ background: "linear-gradient(to top, var(--color-bg) 30%, transparent)" }}
        aria-hidden
      />
      <BottomNav />
    </>
  );
}
