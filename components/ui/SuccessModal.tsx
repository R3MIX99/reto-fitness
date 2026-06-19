"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

interface SuccessModalProps {
  title: string;
  subtitle?: string;
  onDone: () => void;
  duration?: number;
}

export function SuccessModal({ title, subtitle, onDone, duration = 1800 }: SuccessModalProps) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Entrada
    requestAnimationFrame(() => setVisible(true));

    const fadeTimer = setTimeout(() => setFading(true), duration);
    const doneTimer = setTimeout(() => onDone(), duration + 400);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, [duration, onDone]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-8"
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        opacity: fading ? 0 : visible ? 1 : 0,
        transition: "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div
        className="w-full max-w-[280px] bg-[#111] rounded-[24px] p-8 flex flex-col items-center text-center border border-emerald-500/60"
        style={{
          transform: visible && !fading ? "scale(1)" : "scale(0.88)",
          transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow: "0 0 40px rgba(52,211,153,0.15)",
        }}
      >
        {/* Checkmark */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/50 flex items-center justify-center mb-4">
          <Check size={30} strokeWidth={2.5} className="text-emerald-400" />
        </div>

        <p className="font-display font-semibold text-[18px] text-[var(--color-fg)] mb-1">{title}</p>
        {subtitle && <p className="text-[13px] text-[var(--color-muted)]">{subtitle}</p>}
      </div>
    </div>
  );
}
