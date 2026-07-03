"use client";

import { useQuery } from "@tanstack/react-query";
import { listOfflineCheckMetas, type OfflineCheckMeta } from "@/lib/offline/queue";
import { PENDING_SYNC, type DailyCheck } from "./useChecklist";

// Lee la cola de evidencias guardadas sin conexión (solo metadatos, sin blobs,
// para no retener las imágenes en memoria). Se refresca cuando se encola algo
// nuevo o cuando el sync la vacía (vía invalidación de queryKey).
export function useOfflineChecks() {
  return useQuery({
    queryKey: ["offlineChecks"],
    queryFn: listOfflineCheckMetas,
    staleTime: 0,
  });
}

// Convierte un item de la cola en un DailyCheck sintético para renderizar la
// meta como "completada · guardado sin conexión". La ruta de evidencia usa el
// prefijo offline: para que la UI cargue la miniatura desde IndexedDB.
export function offlineToDailyCheck(oc: OfflineCheckMeta, groupId: string): DailyCheck {
  return {
    id: `offline-${oc.id}`,
    goal_id: oc.goalId,
    kind: oc.kind,
    check_date: oc.checkDate,
    status: PENDING_SYNC,
    evidence_path: `offline:${oc.id}`,
    evidence: oc.evidence,
    group_id: groupId,
    created_at: new Date(oc.createdAt).toISOString(),
  };
}
