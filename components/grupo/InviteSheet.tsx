"use client";

import { Copy, X, Check } from "lucide-react";
import { useState } from "react";

interface InviteSheetProps {
  inviteCode: string;
  groupName: string;
  onClose: () => void;
}

export function InviteSheet({ inviteCode, groupName, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/unirse?code=${inviteCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative w-full bg-[var(--color-bg-card)] rounded-t-[24px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[#2a2a2a] mx-auto mb-5" />

        <button onClick={onClose} className="absolute top-5 right-5 text-[var(--color-muted)]">
          <X size={18} strokeWidth={1.5} />
        </button>

        <h2 className="font-display font-medium text-[18px] mb-1">Invitar al grupo</h2>
        <p className="text-[13px] text-[var(--color-muted)] mb-5">{groupName}</p>

        {/* Code */}
        <div className="bg-[#1a1a1a] rounded-[14px] p-4 mb-3 text-center">
          <p className="text-[11px] text-[var(--color-muted)] mb-1">Código de invitación</p>
          <p className="font-display font-semibold text-[28px] tracking-widest text-warm">{inviteCode}</p>
        </div>

        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-pill py-3 text-[14px] font-medium"
        >
          {copied ? <Check size={16} strokeWidth={2} /> : <Copy size={16} strokeWidth={1.5} />}
          {copied ? "Enlace copiado" : "Copiar enlace de invitación"}
        </button>
      </div>
    </div>
  );
}
