"use client";

import { WifiOff, RotateCw } from "lucide-react";

// Página de respaldo que el service worker muestra cuando el usuario navega
// sin conexión y la ruta no está cacheada. Debe ser autónoma (sin datos).
export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-bg-card)]">
        <WifiOff className="h-9 w-9 text-[var(--color-muted)]" strokeWidth={1.5} />
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl text-[var(--color-fg)]">Sin conexión</h1>
        <p className="max-w-xs text-sm text-[var(--color-muted)]">
          Parece que te quedaste sin internet. Revisa tu conexión y vuelve a
          intentarlo.
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 rounded-pill bg-accent px-6 py-3.5 text-[15px] font-medium text-white transition-opacity active:opacity-75"
      >
        <RotateCw className="h-4 w-4" strokeWidth={2} />
        Reintentar
      </button>
    </main>
  );
}
