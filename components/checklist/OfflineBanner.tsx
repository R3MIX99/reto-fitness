"use client";

import { CloudOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useOfflineChecks } from "@/lib/hooks/useOfflineChecks";

// Aviso en el Checklist. Dos casos:
//  - Sin conexión: explica que las evidencias se guardan y se enviarán al reconectar.
//  - Con conexión pero con cola pendiente: indica que se están sincronizando.
export function OfflineBanner() {
  const online = useOnlineStatus();
  const { data: queue = [] } = useOfflineChecks();
  const pending = queue.length;

  if (online && pending === 0) return null;

  if (!online) {
    return (
      <div
        className="mb-3 flex items-start gap-2.5 rounded-[14px] px-3.5 py-2.5"
        style={{ background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.28)" }}
      >
        <CloudOff size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--color-warm)]" />
        <div>
          <p className="text-[13px] font-medium text-[var(--color-fg)]">Estás sin conexión</p>
          <p className="text-[12px] text-[var(--color-muted)]">
            Puedes marcar tus metas: se guardan y se enviarán a revisión cuando
            recuperes internet{pending > 0 ? ` (${pending} pendiente${pending > 1 ? "s" : ""})` : ""}.
          </p>
        </div>
      </div>
    );
  }

  // Online con pendientes → sincronizando.
  return (
    <div
      className="mb-3 flex items-center gap-2.5 rounded-[14px] px-3.5 py-2.5"
      style={{ background: "rgba(207,92,54,0.1)", border: "1px solid rgba(207,92,54,0.28)" }}
    >
      <RefreshCw size={15} strokeWidth={1.5} className="shrink-0 animate-spin text-accent" />
      <p className="text-[12px] text-[var(--color-fg)]">
        Enviando {pending} evidencia{pending > 1 ? "s" : ""} guardada{pending > 1 ? "s" : ""} sin conexión…
      </p>
    </div>
  );
}
