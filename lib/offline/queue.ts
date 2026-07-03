// Cola de evidencias marcadas sin conexión.
// Se guardan en IndexedDB (blobs + metadatos) y se reproducen cuando vuelve la
// red. Usa un store propio de idb-keyval, aislado de la caché de Query.

import { createStore, set, get, del, values } from "idb-keyval";
import type { CheckEvidence, GoalKind } from "@/lib/hooks/useChecklist";

const store = createStore("olympo-offline", "checks");

export interface OfflineBlob {
  blob: Blob;
  ext: string;
}

export interface OfflineCheck {
  // Clave de "slot": kind|goalId|fecha. Re-marcar la misma meta reemplaza.
  id: string;
  userId: string;
  kind: GoalKind;
  goalId: string | null;
  checkDate: string;
  // Evidencia principal (foto comprimida o video).
  main: OfflineBlob;
  isVideo: boolean;
  // Resumen / cronómetro (las rutas de archivos se llenan al sincronizar).
  evidence: CheckEvidence | null;
  // Archivos extra de evidencia rica.
  after?: OfflineBlob;
  audio?: OfflineBlob;
  video?: OfflineBlob;
  createdAt: number;
}

export function slotId(kind: GoalKind, goalId: string | null | undefined, checkDate: string): string {
  return `${kind}|${goalId ?? ""}|${checkDate}`;
}

export async function enqueueOfflineCheck(item: OfflineCheck): Promise<void> {
  await set(item.id, item, store);
}

export async function listOfflineChecks(): Promise<OfflineCheck[]> {
  const all = (await values(store)) as OfflineCheck[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getOfflineCheck(id: string): Promise<OfflineCheck | undefined> {
  return (await get(id, store)) as OfflineCheck | undefined;
}

export async function removeOfflineCheck(id: string): Promise<void> {
  await del(id, store);
}
