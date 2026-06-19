"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";

interface InviteSheetProps {
  open: boolean;
  inviteCode: string;
  groupName: string;
  onClose: () => void;
}

export function InviteSheet({ open, inviteCode, groupName, onClose }: InviteSheetProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/unirse?code=${inviteCode}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-6 pb-8 pt-2">
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
    </Drawer>
  );
}
