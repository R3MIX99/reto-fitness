"use client";

import { useEffect, useState, type RefObject } from "react";

// Indicador de scroll horizontal (track + thumb). Visible en tema claro y oscuro.
// Solo se muestra si el contenido realmente desborda.
export function ScrollIndicator({ scrollRef, className = "" }: { scrollRef: RefObject<HTMLElement | null>; className?: string }) {
  const [thumb, setThumb] = useState({ width: 24, left: 0, show: false });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const TRACK = 56;
    const update = () => {
      const scrollable = el.scrollWidth > el.clientWidth + 2;
      if (!scrollable) { setThumb((t) => ({ ...t, show: false })); return; }
      const ratio = el.clientWidth / el.scrollWidth;
      const w = Math.max(18, Math.round(TRACK * ratio));
      const max = el.scrollWidth - el.clientWidth;
      const p = max > 0 ? el.scrollLeft / max : 0;
      setThumb({ width: w, left: Math.round(p * (TRACK - w)), show: true });
    };
    el.addEventListener("scroll", update, { passive: true });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, [scrollRef]);

  if (!thumb.show) return null;

  return (
    <div className={`flex justify-center ${className}`}>
      {/* track: gris translúcido para que se vea su tope en ambos temas */}
      <div className="relative w-14 h-1 rounded-full" style={{ background: "rgba(124,124,124,0.22)" }}>
        <div
          className="absolute top-0 h-1 rounded-full transition-all duration-150"
          style={{ width: thumb.width, left: thumb.left, background: "var(--color-muted)" }}
        />
      </div>
    </div>
  );
}
