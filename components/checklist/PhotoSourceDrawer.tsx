"use client";

import { useRef } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Camera, ImageIcon } from "lucide-react";

interface PhotoSourceDrawerProps {
  open: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
}

export function PhotoSourceDrawer({ open, onClose, onFileSelected }: PhotoSourceDrawerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    onFileSelected(file);
  }

  return (
    <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: "var(--color-overlay)" }}
        />
        <VaulDrawer.Content
          className="fixed bottom-0 left-0 right-0 z-[160] rounded-t-[26px] outline-none flex flex-col"
          style={{ background: "var(--color-bg-card)" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="px-5 pb-8">
            <p className="font-display font-medium text-[17px] mb-1">Cambiar evidencia</p>
            <p className="text-[13px] mb-5" style={{ color: "var(--color-muted)" }}>
              ¿Cómo quieres subir la nueva foto?
            </p>

            <div className="flex flex-col gap-3">
              {/* Camera option */}
              <button
                onClick={() => { if (cameraRef.current) { cameraRef.current.value = ""; cameraRef.current.click(); } }}
                className="flex items-center gap-3 rounded-[16px] px-4 py-4 text-left"
                style={{ background: "var(--color-surface)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(207,92,54,0.15)" }}
                >
                  <Camera size={18} strokeWidth={1.5} className="text-accent" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">Tomar foto</p>
                  <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>Abre la cámara</p>
                </div>
              </button>

              {/* Gallery option */}
              <button
                onClick={() => { if (galleryRef.current) { galleryRef.current.value = ""; galleryRef.current.click(); } }}
                className="flex items-center gap-3 rounded-[16px] px-4 py-4 text-left"
                style={{ background: "var(--color-surface)" }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,200,139,0.15)" }}
                >
                  <ImageIcon size={18} strokeWidth={1.5} className="text-warm" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">Elegir de galería</p>
                  <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>Selecciona una foto existente</p>
                </div>
              </button>
            </div>
          </div>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}
