"use client";

import { useEffect, useState } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Camera, Send, RefreshCw } from "lucide-react";

interface EvidencePreviewDrawerProps {
  file: File | null;
  open: boolean;
  uploading?: boolean;
  onConfirm: () => void;
  onRetake: () => void;
  onClose: () => void;
}

export function EvidencePreviewDrawer({
  file,
  open,
  uploading,
  onConfirm,
  onRetake,
  onClose,
}: EvidencePreviewDrawerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay
          className="fixed inset-0 z-[170]"
          style={{ background: "var(--color-overlay)" }}
        />
        <VaulDrawer.Content
          className="fixed bottom-0 left-0 right-0 z-[180] rounded-t-[26px] outline-none flex flex-col"
          style={{ background: "var(--color-bg-card)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="px-5 pb-8">
            <p className="font-display font-medium text-[17px] mb-4">¿Se ve bien la foto?</p>

            {/* Preview (con estado de carga mientras la foto se comprime) */}
            <div
              className="relative rounded-[18px] overflow-hidden mb-4 aspect-square w-full max-w-[260px] mx-auto"
              style={{ background: "var(--color-surface)" }}
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-warm)] animate-spin" />
                  <span className="text-[12px] text-[var(--color-muted)]">Preparando foto…</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onRetake}
                disabled={uploading || !file}
                className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-[14px] disabled:opacity-50"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <Camera size={15} strokeWidth={1.5} />
                Cambiar foto
              </button>
              <button
                onClick={onConfirm}
                disabled={uploading || !file}
                className="flex-1 flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-medium disabled:opacity-70"
                style={{ background: "var(--color-accent)", color: "#4A1B0C" }}
              >
                {uploading ? (
                  <RefreshCw size={15} strokeWidth={1.5} className="animate-spin" />
                ) : (
                  <Send size={15} strokeWidth={1.5} />
                )}
                {uploading ? "Subiendo…" : "Enviar"}
              </button>
            </div>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}
