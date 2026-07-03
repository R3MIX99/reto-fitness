// Motor de sincronización: reproduce la cola offline cuando vuelve la red.
// Corre en primer plano (al reconectar o al abrir la app). Cada item se sube
// con la misma lógica que el envío en línea y se elimina de la cola al lograrlo.

import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { submitCheckToServer, invalidateScoreQueries } from "@/lib/hooks/useChecklist";
import { listOfflineChecks, removeOfflineCheck } from "./queue";

// Evita ejecuciones concurrentes (p. ej. evento "online" + montaje simultáneos).
let syncing = false;

export async function syncOfflineChecks(qc: QueryClient): Promise<void> {
  if (syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const items = await listOfflineChecks();
  if (!items.length) return;

  syncing = true;
  let changed = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // sin sesión válida no podemos subir; reintenta luego

    for (const oc of items) {
      if (oc.userId !== user.id) continue; // seguridad: no subir de otra sesión
      try {
        await submitCheckToServer(supabase, {
          userId: user.id,
          kind: oc.kind,
          goalId: oc.goalId,
          checkDate: oc.checkDate,
          prepared: {
            main: oc.main,
            isVideo: oc.isVideo,
            after: oc.after,
            audio: oc.audio,
            video: oc.video,
          },
          evidence: oc.evidence,
        });
        await removeOfflineCheck(oc.id);
        changed = true;
      } catch (err) {
        // Falla transitoria: se queda en la cola para el próximo intento.
        console.warn("Sync offline check falló, se reintentará:", oc.id, err);
      }
    }
  } finally {
    syncing = false;
    if (changed) {
      qc.invalidateQueries({ queryKey: ["offlineChecks"] });
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["dateChecks"] });
      invalidateScoreQueries(qc);
    }
  }
}
