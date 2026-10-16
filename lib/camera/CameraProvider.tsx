"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CameraView } from "@/components/camera/CameraView";

interface CameraContextValue {
  /** Abre la cámara integrada. Devuelve la foto, o null si el usuario cancela. */
  openCamera: () => Promise<File | null>;
}

const CameraContext = createContext<CameraContextValue>({
  openCamera: async () => {
    console.warn("useCamera: falta <CameraProvider> en el árbol");
    return null;
  },
});

export function useCamera() {
  return useContext(CameraContext);
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const resolver = useRef<((file: File | null) => void) | null>(null);

  useEffect(() => setMounted(true), []);

  const finish = useCallback((file: File | null) => {
    resolver.current?.(file);
    resolver.current = null;
    setOpen(false);
  }, []);

  const openCamera = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        resolver.current?.(null); // si había una abierta, se cancela
        resolver.current = resolve;
        setOpen(true);
      }),
    []
  );

  const value = useMemo(() => ({ openCamera }), [openCamera]);

  return (
    <CameraContext.Provider value={value}>
      {children}
      {mounted && open &&
        createPortal(
          <CameraView onCapture={(f) => finish(f)} onCancel={() => finish(null)} />,
          document.body
        )}
    </CameraContext.Provider>
  );
}
