"use client";

import { useState } from "react";
import { Copy, Check, Share2, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Drawer } from "@/components/ui/Drawer";

interface InviteSheetProps {
  open: boolean;
  inviteCode: string;
  groupName: string;
  onClose: () => void;
}

export function InviteSheet({ open, inviteCode, groupName, onClose }: InviteSheetProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteLink = `${origin}/grupo/unirse?code=${inviteCode}`;

  async function handleCopyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a ${groupName}`,
          text: `Te invito a unirte a mi grupo "${groupName}" en Reto Fitness. Usa el código: ${inviteCode}`,
          url: inviteLink,
        });
      } catch {
        // user cancelled
      }
    } else {
      await handleCopyLink();
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-6 pb-8 pt-2">
        <h2 className="font-display font-medium text-[18px] mb-1">Invitar al grupo</h2>
        <p className="text-[13px] text-[var(--color-muted)] mb-5">{groupName}</p>

        {/* Code display */}
        <div className="bg-[#1a1a1a] rounded-[14px] p-4 mb-4 text-center">
          <p className="text-[11px] text-[var(--color-muted)] mb-2">Código de invitación</p>
          <p className="font-display font-semibold text-[28px] tracking-widest text-warm mb-3">
            {inviteCode}
          </p>
          <button
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-2 mx-auto text-[12px] text-[var(--color-muted)] border border-[#2a2a2a] rounded-full px-4 py-1.5 transition-colors"
          >
            {copiedCode ? <Check size={13} strokeWidth={2} className="text-accent" /> : <Copy size={13} strokeWidth={1.5} />}
            {copiedCode ? "Código copiado" : "Copiar código"}
          </button>
        </div>

        {/* QR toggle */}
        <button
          onClick={() => setShowQr((v) => !v)}
          className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] py-3 text-[13px] text-[var(--color-muted)] mb-3"
        >
          <QrCode size={16} strokeWidth={1.5} />
          {showQr ? "Ocultar QR" : "Mostrar código QR"}
        </button>

        {showQr && (
          <div className="flex justify-center mb-4 bg-white rounded-[14px] p-4">
            <QRCodeSVG value={inviteLink} size={180} bgColor="#ffffff" fgColor="#0a0a0a" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[var(--color-fg)] rounded-pill py-3 text-[14px]"
          >
            {copiedLink ? <Check size={16} strokeWidth={2} className="text-accent" /> : <Copy size={16} strokeWidth={1.5} />}
            {copiedLink ? "Enlace copiado" : "Copiar enlace"}
          </button>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white rounded-pill py-3 text-[14px] font-medium"
          >
            <Share2 size={16} strokeWidth={1.5} />
            Compartir invitación
          </button>
        </div>
      </div>
    </Drawer>
  );
}
