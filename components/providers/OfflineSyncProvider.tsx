"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncOfflineChecks } from "@/lib/offline/sync";

// Dispara la sincronización de la cola offline:
//  - al montar (por si quedó algo pendiente de una sesión previa),
//  - cada vez que el navegador recupera la conexión.
export function OfflineSyncProvider({ children }: { children?: React.ReactNode }) {
  const qc = useQueryClient();

  useEffect(() => {
    const run = () => { void syncOfflineChecks(qc); };
    run();
    window.addEventListener("online", run);
    // Al volver a la pestaña, reintenta por si el evento "online" se perdió.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run();
    });
    window.addEventListener("focus", run);
    return () => {
      window.removeEventListener("online", run);
      window.removeEventListener("focus", run);
    };
  }, [qc]);

  return <>{children}</>;
}
