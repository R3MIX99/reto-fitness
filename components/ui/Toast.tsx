"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

// Toast simple que aparece desde abajo y se oculta solo.
export function Toast({ message, onDone, duration = 2500 }: { message: string; onDone: () => void; duration?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [onDone, duration]);

  return (
    <div className="fixed bottom-[88px] left-4 right-4 z-[95] flex justify-center pointer-events-none">
      <div
        className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg animate-slide-up"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
      >
        <Check size={14} strokeWidth={2} className="text-warm flex-shrink-0" />
        <p className="text-[13px] text-[var(--color-fg)]">{message}</p>
      </div>
    </div>
  );
}
