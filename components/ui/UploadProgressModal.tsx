"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface UploadProgressModalProps {
  phase: "uploading" | "success" | null;
  onDone: () => void;
}

export function UploadProgressModal({ phase, onDone }: UploadProgressModalProps) {
  const [checkVisible, setCheckVisible] = useState(false);

  useEffect(() => {
    if (phase === "success") {
      const raf = requestAnimationFrame(() => setCheckVisible(true));
      const t = setTimeout(onDone, 850);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    } else {
      setCheckVisible(false);
    }
  }, [phase, onDone]);

  if (!phase) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="w-[148px] h-[148px] rounded-[32px] flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
      >
        {phase === "uploading" ? (
          <div
            className="w-14 h-14 rounded-full animate-spin"
            style={{
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-warm)",
            }}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "2px solid rgba(34,197,94,0.5)",
              transform: checkVisible ? "scale(1)" : "scale(0.4)",
              opacity: checkVisible ? 1 : 0,
              transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
            }}
          >
            <Check size={28} strokeWidth={2.5} style={{ color: "#22c55e" }} />
          </div>
        )}
        <p
          className="text-[13px] font-medium"
          style={{ color: "var(--color-muted)" }}
        >
          {phase === "uploading" ? "Subiendo foto…" : "¡Listo!"}
        </p>
      </div>
    </div>
  );
}
