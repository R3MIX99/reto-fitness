"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { compressImage } from "./useProfile";
import { enqueueOfflineCheck, slotId } from "@/lib/offline/queue";

// Status sintético (solo en el cliente) para evidencias guardadas sin conexión
// que aún no se han subido al servidor.
export const PENDING_SYNC = "pending_sync";

// ── Upload helper con reintentos ──────────────────────────────────────────
// Reintenta la subida hasta maxTries veces con pausa creciente antes de fallar.
// Evita errores transitorios de red o de acceso a cámara.
export async function uploadWithRetry(
  bucket: ReturnType<ReturnType<typeof createClient>["storage"]["from"]>,
  path: string,
  data: File | Blob,
  maxTries = 3,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 600 * attempt));
    const { error } = await bucket.upload(path, data, { upsert: true });
    if (!error) return;
    lastErr = error;
  }
  throw lastErr;
}

// ── Types ──────────────────────────────────────────────────────────────────

export type GoalKind = "gym" | "diet" | "goal";

// Metas personalizables (Pro/Elite): módulos de evidencia opcionales.
export type GoalModule = "timer" | "summary" | "audio" | "video" | "before_after";
export type GoalFrequency = "daily" | "weekly" | "once" | "monthly";
export interface GoalConfig {
  modules: GoalModule[];
  timer_minutes?: number;
  // Frecuencia (Pro/Elite). "daily" = todos los días (por defecto).
  // "weekly" = solo los días de la semana en weekdays (0=domingo … 6=sábado).
  // "once" = solo en once_date. "monthly" = solo el día day_of_month de cada mes.
  frequency?: GoalFrequency;
  weekdays?: number[];    // 0-6 (getDay) cuando frequency = "weekly"
  once_date?: string;     // "YYYY-MM-DD" cuando frequency = "once"
  day_of_month?: number;  // 1-31 cuando frequency = "monthly"
}
export interface CheckEvidence {
  summary?: string;
  timer_seconds?: number;
  audio_path?: string;
  video_path?: string;
  after_path?: string;   // foto "después"; la "antes" es evidence_path
}
export interface ExtraFiles {
  audio?: File;
  video?: File;
  after?: File;
}

export function hasModules(goal: Goal): boolean {
  return !!goal.config && Array.isArray(goal.config.modules) && goal.config.modules.length > 0;
}

// La evidencia principal de una meta de solo-video es el propio video (no foto).
export function isVideoPath(path?: string | null): boolean {
  if (!path) return false;
  return /\.(mp4|mov|webm|m4v|3gp|ogg)$/i.test(path);
}

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  position: number;
  icon: string | null;
  reminder_at: string | null;
  active: boolean;
  group_id: string | null;
  config: GoalConfig | null;
  created_at: string;
  deactivated_at: string | null;
}

// Una meta "aplica" en una fecha si ya existía ese día y aún no estaba borrada.
// Sirve para no mostrar/contar metas en días previos a su creación, ni después
// de borrarlas. dateStr en formato "YYYY-MM-DD".
export function goalAppliesOn(goal: Goal, dateStr: string): boolean {
  const created = goal.created_at ? goal.created_at.slice(0, 10) : "";
  if (created && created > dateStr) return false;
  if (goal.deactivated_at) {
    const off = goal.deactivated_at.slice(0, 10);
    if (dateStr >= off) return false;
  } else if (!goal.active) {
    // Inactiva sin fecha (legado): no aplica a ningún día.
    return false;
  }
  // Frecuencia: semanal / un solo día / mensual solo aplican en sus días.
  const freq = goal.config?.frequency ?? "daily";
  if (freq === "weekly") {
    const wd = new Date(dateStr + "T12:00:00").getDay(); // 0=domingo … 6=sábado
    return Array.isArray(goal.config?.weekdays) && goal.config!.weekdays!.includes(wd);
  }
  if (freq === "once") {
    if (!goal.config?.once_date) return false;
    return goal.config.once_date === dateStr;
  }
  if (freq === "monthly") {
    const dom = goal.config?.day_of_month;
    if (!dom) return false;
    return Number(dateStr.slice(8, 10)) === dom;
  }
  return true;
}

// Etiqueta legible de la frecuencia de una meta (para metas programadas).
export function frequencyLabel(goal: Goal): string | null {
  const cfg = goal.config;
  if (!cfg || !cfg.frequency || cfg.frequency === "daily") return null;
  if (cfg.frequency === "weekly" && Array.isArray(cfg.weekdays) && cfg.weekdays.length > 0) {
    const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const order = [1, 2, 3, 4, 5, 6, 0]; // L M M J V S D
    const labels = order.filter((d) => cfg.weekdays!.includes(d)).map((d) => DIAS[d]);
    return labels.join(", ");
  }
  if (cfg.frequency === "once" && cfg.once_date) {
    const d = new Date(cfg.once_date + "T12:00:00");
    const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    return `Solo el ${d.getDate()} ${MESES[d.getMonth()]}`;
  }
  if (cfg.frequency === "monthly" && cfg.day_of_month) {
    return `Día ${cfg.day_of_month} de cada mes`;
  }
  return null;
}

export interface DailyCheck {
  id: string;
  goal_id: string | null;
  kind: string;
  check_date: string;
  status: string;
  evidence_path: string;
  evidence: CheckEvidence | null;
  group_id: string;
  created_at: string;
}

export type CategoryView = "general" | "ejercicio" | "dieta" | "metas";

export const CATEGORY_CONFIG = {
  general:   { label: "General",   color: "#EFC88B", tint: "rgba(239,200,139,.14)", textDark: "#4A1B0C" },
  ejercicio: { label: "Ejercicio", color: "#CF5C36", tint: "rgba(207,92,54,.18)",   textDark: "#4A1B0C" },
  dieta:     { label: "Dieta",     color: "#EFC88B", tint: "rgba(239,200,139,.16)", textDark: "#4A1B0C" },
  metas:     { label: "Metas",     color: "#EEE5E9", tint: "rgba(238,229,233,.12)", textDark: "#000000" },
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayStr() {
  return localDateStr(new Date());
}

function monthStart(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  return localDateStr(d);
}

function monthEnd(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset + 1, 0);
  return localDateStr(d);
}

// ── Hooks ──────────────────────────────────────────────────────────────────

// Invalida TODAS las queries que dependen de los puntos para que el cambio se
// refleje en el dashboard, la tabla global y las tablas de temporada.
export function invalidateScoreQueries(qc: QueryClient) {
  for (const k of [
    "leaderboard", "globalLeaderboard", "seasonLeaderboard", "seasonStandings",
    "todayScore", "streak", "monthChecks", "playerCard", "myTitles",
  ]) {
    qc.invalidateQueries({ queryKey: [k] });
  }
}

// Recalcula en el servidor los puntos del usuario (todos sus días con registro)
// tras crear/borrar una meta, ya que cambia el denominador proporcional.
async function recalcMyScores() {
  const supabase = createClient();
  await (supabase.rpc as Function)("recalc_my_scores", {});
}

export function useGoals() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["goals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const supabase = createClient();
      type GoalRow = { id: string; title: string; kind: string; position: number; icon: string | null; reminder_at: string | null; active: boolean; group_id: string | null; config: GoalConfig | null; created_at: string; deactivated_at: string | null };
      const { data } = await supabase
        .from("goals")
        .select("id, title, kind, position, icon, reminder_at, active, group_id, config, created_at, deactivated_at")
        .eq("user_id", user!.id)
        .eq("active", true)
        .order("position", { ascending: true }) as unknown as { data: GoalRow[] | null };

      return (data ?? []) as Goal[];
    },
  });
}

// Todas las metas (activas e inactivas) con sus fechas de vida útil. Se usa para
// el calendario/estadísticas y la vista de días pasados, donde una meta debe
// aparecer solo en los días en que estuvo vigente.
export function useGoalsHistory() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["goalsHistory", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const supabase = createClient();
      type GoalRow = { id: string; title: string; kind: string; position: number; icon: string | null; reminder_at: string | null; active: boolean; group_id: string | null; config: GoalConfig | null; created_at: string; deactivated_at: string | null };
      const { data } = await supabase
        .from("goals")
        .select("id, title, kind, position, icon, reminder_at, active, group_id, config, created_at, deactivated_at")
        .eq("user_id", user!.id)
        .order("position", { ascending: true }) as unknown as { data: GoalRow[] | null };

      return (data ?? []) as Goal[];
    },
  });
}

export function useDateChecks(groupIds: string | string[] | null, date: string) {
  const { user } = useUser();
  const ids = Array.isArray(groupIds) ? groupIds : groupIds ? [groupIds] : [];
  return useQuery({
    queryKey: ["dateChecks", user?.id, ids, date],
    enabled: !!user && ids.length > 0 && !!date,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<DailyCheck[]> => {
      const supabase = createClient();
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; evidence: CheckEvidence | null; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, evidence, group_id, created_at")
        .eq("user_id", user!.id)
        .in("group_id", ids)
        .eq("check_date", date) as unknown as { data: CheckRow[] | null };

      // Fan-out: misma meta puede tener una fila por grupo → elegir mejor status
      const best = new Map<string, CheckRow>();
      for (const row of data ?? []) {
        const key = `${row.kind}|${row.goal_id ?? ""}`;
        const existing = best.get(key);
        if (!existing || (STATUS_RANK[row.status] ?? 0) > (STATUS_RANK[existing.status] ?? 0)) {
          best.set(key, row);
        }
      }
      return Array.from(best.values()) as DailyCheck[];
    },
  });
}

// Prioridad de status para deduplicación fan-out: approved > pending > rejected
const STATUS_RANK: Record<string, number> = { approved: 3, pending: 2, rejected: 1 };

export function useTodayChecks(groupIds: string | string[] | null) {
  const { user } = useUser();
  const ids = Array.isArray(groupIds) ? groupIds : groupIds ? [groupIds] : [];
  return useQuery({
    queryKey: ["todayChecks", user?.id, ids],
    enabled: !!user && ids.length > 0,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async (): Promise<DailyCheck[]> => {
      const supabase = createClient();
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; evidence: CheckEvidence | null; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, evidence, group_id, created_at")
        .eq("user_id", user!.id)
        .in("group_id", ids)
        .eq("check_date", todayStr()) as unknown as { data: CheckRow[] | null };

      // Fan-out: el mismo goal puede tener una fila por grupo.
      // De-duplicar por kind+goal_id eligiendo el mejor status (approved > pending > rejected).
      const best = new Map<string, CheckRow>();
      for (const row of data ?? []) {
        const key = `${row.kind}|${row.goal_id ?? ""}`;
        const existing = best.get(key);
        if (!existing || (STATUS_RANK[row.status] ?? 0) > (STATUS_RANK[existing.status] ?? 0)) {
          best.set(key, row);
        }
      }
      return Array.from(best.values()) as DailyCheck[];
    },
  });
}

export function useMonthChecks(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["monthChecks", user?.id, groupId],
    enabled: !!user && !!groupId,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async (): Promise<DailyCheck[]> => {
      const supabase = createClient();
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; evidence: CheckEvidence | null; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, evidence, group_id, created_at")
        .eq("user_id", user!.id)
        .eq("group_id", groupId!)
        .gte("check_date", monthStart())
        .lte("check_date", monthEnd()) as unknown as { data: CheckRow[] | null };
      return (data ?? []) as DailyCheck[];
    },
  });
}

// ── Realtime ───────────────────────────────────────────────────────────────

// Suscribe a cambios en daily_checks del usuario actual y refresca las queries
// del checklist cuando un compañero aprueba o rechaza una evidencia.
export function useChecklistRealtime(groupId: string | null) {
  const { user } = useUser();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user || !groupId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`checklist-rt-${user.id}-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "daily_checks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["todayChecks"] });
          qc.invalidateQueries({ queryKey: ["monthChecks"] });
          qc.invalidateQueries({ queryKey: ["dateChecks"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, groupId, qc]);
}

// ── Envío de evidencia (compartido online / sync offline) ───────────────────

// Evidencia ya lista para subir: blobs comprimidos + extensiones. Se genera en
// el cliente (funciona sin conexión) y la comparten el envío en línea y la cola.
export interface PreparedEvidence {
  main: { blob: Blob; ext: string };
  isVideo: boolean;
  after?: { blob: Blob; ext: string };
  audio?: { blob: Blob; ext: string };
  video?: { blob: Blob; ext: string };
}

// Comprime la evidencia principal (foto) y la foto "después"; deja audio/video
// tal cual. La compresión es client-side, así que corre igual sin internet.
export async function prepareEvidence(file: File, extraFiles?: ExtraFiles): Promise<PreparedEvidence> {
  const isVideo = file.type.startsWith("video");
  const main = isVideo
    ? { blob: file as Blob, ext: file.name.split(".").pop() || "mp4" }
    : { blob: await compressImage(file, 1080), ext: "jpg" };

  const prepared: PreparedEvidence = { main, isVideo };
  if (extraFiles?.after) prepared.after = { blob: await compressImage(extraFiles.after, 1080), ext: "jpg" };
  if (extraFiles?.audio) prepared.audio = { blob: extraFiles.audio, ext: extraFiles.audio.name.split(".").pop() || "webm" };
  if (extraFiles?.video) prepared.video = { blob: extraFiles.video, ext: extraFiles.video.name.split(".").pop() || "mp4" };
  return prepared;
}

// Sube la evidencia ya preparada al Storage e inserta el check en TODOS los
// grupos del usuario (fan-out), recalculando puntos y racha. Se usa tanto en el
// envío en línea como al drenar la cola offline (por eso recibe checkDate).
export async function submitCheckToServer(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    activeGroupId?: string | null;
    kind: GoalKind;
    goalId?: string | null;
    checkDate: string;
    prepared: PreparedEvidence;
    evidence?: CheckEvidence | null;
  },
): Promise<void> {
  const { userId, activeGroupId, kind, goalId, checkDate, prepared, evidence } = params;
  const base = `${userId}/${checkDate}/${kind}${goalId ? `-${goalId}` : ""}`;
  const evidBucket = supabase.storage.from("evidencias");

  const path = `${base}.${prepared.main.ext}`;
  await uploadWithRetry(evidBucket, path, prepared.main.blob);

  const rich: CheckEvidence = { ...(evidence ?? {}) };
  if (prepared.after) {
    const p = `${base}-after.jpg`;
    await uploadWithRetry(evidBucket, p, prepared.after.blob);
    rich.after_path = p;
  }
  if (prepared.audio) {
    const p = `${base}-audio.${prepared.audio.ext}`;
    await uploadWithRetry(evidBucket, p, prepared.audio.blob);
    rich.audio_path = p;
  }
  if (prepared.video) {
    const p = `${base}-video.${prepared.video.ext}`;
    await uploadWithRetry(evidBucket, p, prepared.video.blob);
    rich.video_path = p;
  }
  const finalEvidence = Object.keys(rich).length > 0 ? rich : null;

  type MembershipRow = { group_id: string };
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId) as unknown as { data: MembershipRow[] | null };

  const groupIds = (memberships ?? []).map((m) => m.group_id);
  if (activeGroupId && !groupIds.includes(activeGroupId)) groupIds.push(activeGroupId);
  if (!groupIds.length) throw new Error("Sin grupos para registrar el check");

  for (const gid of groupIds) {
    const deleteQuery = supabase
      .from("daily_checks")
      .delete()
      .eq("user_id", userId)
      .eq("group_id", gid)
      .eq("check_date", checkDate)
      .eq("kind", kind);

    if (goalId) {
      const { error: delErr } = await (deleteQuery.eq("goal_id", goalId) as unknown as Promise<{ error: unknown }>);
      if (delErr) console.warn("delete check warning:", delErr);
    } else {
      const { error: delErr } = await (deleteQuery.is("goal_id", null) as unknown as Promise<{ error: unknown }>);
      if (delErr) console.warn("delete check warning:", delErr);
    }

    const { error: insertError } = await supabase
      .from("daily_checks")
      .insert({
        user_id: userId,
        group_id: gid,
        kind,
        goal_id: goalId ?? null,
        evidence_path: path,
        evidence: finalEvidence,
        check_date: checkDate,
        status: "pending",
      } as never) as unknown as { error: { message: string } | null };

    if (insertError) throw new Error((insertError as { message: string }).message);

    await (supabase.rpc as Function)("recalc_day_score", {
      p_user_id: userId,
      p_group_id: gid,
      p_date: checkDate,
    });
    await (supabase.rpc as Function)("compute_user_streak", {
      p_user_id: userId,
      p_group_id: gid,
    });
  }
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useMarkCheck(groupId: string | null) {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    // Optimistic update: muestra el check como "pending" al instante, antes de que
    // el servidor responda. Si falla, revierte al estado anterior.
    onMutate: async ({ kind, goalId }: { file: File; kind: GoalKind; goalId?: string; evidence?: CheckEvidence; extraFiles?: ExtraFiles }) => {
      if (!user || !groupId) return;
      // Sin conexión: la cola offline maneja la UI (badge "guardado sin conexión");
      // evitamos escribir un optimista "pending" fantasma en la caché persistida.
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queryKey = ["todayChecks", user.id, groupId] as const;
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<DailyCheck[]>(queryKey);

      const optimistic: DailyCheck = {
        id: `opt-${Date.now()}`,
        goal_id: goalId ?? null,
        kind,
        check_date: todayStr(),
        status: "pending",
        evidence_path: "",
        evidence: null,
        group_id: groupId,
        created_at: new Date().toISOString(),
      };

      qc.setQueryData<DailyCheck[]>(queryKey, (old) => [
        ...(old ?? []).filter(
          (c) => !(c.kind === kind && c.goal_id === (goalId ?? null))
        ),
        optimistic,
      ]);

      return { prev, queryKey };
    },

    mutationFn: async ({ file, kind, goalId, evidence, extraFiles }: { file: File; kind: GoalKind; goalId?: string; evidence?: CheckEvidence; extraFiles?: ExtraFiles }) => {
      if (!user || !groupId) throw new Error("Sin sesión o grupo");

      // Comprimimos/preparamos la evidencia en el cliente (funciona sin red).
      const prepared = await prepareEvidence(file, extraFiles);
      const checkDate = todayStr();

      // Sin conexión → a la cola de IndexedDB. Se subirá al reconectar.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOfflineCheck({
          id: slotId(kind, goalId, checkDate),
          userId: user.id,
          kind,
          goalId: goalId ?? null,
          checkDate,
          main: prepared.main,
          isVideo: prepared.isVideo,
          evidence: evidence ?? null,
          after: prepared.after,
          audio: prepared.audio,
          video: prepared.video,
          createdAt: Date.now(),
        });
        return;
      }

      // En línea: subida + fan-out + recalculo (lógica compartida con el sync).
      const supabase = createClient();
      await submitCheckToServer(supabase, {
        userId: user.id,
        activeGroupId: groupId,
        kind,
        goalId,
        checkDate,
        prepared,
        evidence,
      });
    },

    onError: (_err, _vars, context) => {
      // Revertir al estado previo si el upload falló
      if (context?.prev !== undefined) {
        qc.setQueryData(context.queryKey, context.prev);
      }
    },

    // Tanto en éxito como en error: sincronizar con el servidor y refrescar la
    // cola offline (para que el badge "guardado sin conexión" aparezca/desaparezca).
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["offlineChecks"] });
      invalidateScoreQueries(qc);
    },
  });
}

export function useUpsertGoal() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Partial<Goal> & { kind: GoalKind; title: string }) => {
      if (!user) throw new Error("Sin sesión");
      const supabase = createClient();

      if (goal.id) {
        const { error } = await supabase
          .from("goals")
          .update({ title: goal.title, icon: goal.icon ?? null, reminder_at: goal.reminder_at ?? null, config: goal.config ?? null } as never)
          .eq("id", goal.id) as unknown as { error: { message: string } | null };
        if (error) throw new Error(error.message);
      } else {
        const { data: existing } = await supabase
          .from("goals")
          .select("id")
          .eq("user_id", user.id)
          .eq("kind", goal.kind) as unknown as { data: { id: string }[] | null };

        const position = (existing?.length ?? 0) + 1;
        const { error } = await supabase
          .from("goals")
          .insert({ user_id: user.id, kind: goal.kind, title: goal.title, position, icon: goal.icon ?? null, group_id: goal.group_id ?? null, config: goal.config ?? null } as never) as unknown as { error: { message: string } | null };
        if (error) throw new Error(error.message);
      }
      // Crear/editar una meta cambia el denominador → recalcular puntos.
      await recalcMyScores();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goalsHistory"] });
      invalidateScoreQueries(qc);
    },
  });
}

export function useDeleteGoal() {
  const { user } = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      // Guardar la fecha de borrado para que la meta deje de contar/mostrarse
      // a partir de hoy, pero siga apareciendo en los días en que estuvo vigente.
      await supabase.from("goals").update({ active: false, deactivated_at: new Date().toISOString() } as never).eq("id", id) as unknown as { error: unknown };
      // Al borrar la meta, quitar también sus recuerdos guardados (ya no se
      // podrán ver) y desmarcar is_memory para que la purga limpie los archivos.
      await (supabase.rpc as Function)("remove_memories_for_goal", { p_goal_id: id });
      // Eliminar los checks de la meta desde hoy: se quitan de revisión/auditoría
      // y dejan de sumar puntos. Devuelve las rutas para borrar del storage.
      const { data: paths } = await (supabase.rpc as Function)("purge_goal_checks", { p_goal_id: id });
      if (Array.isArray(paths) && paths.length) {
        await supabase.storage.from("evidencias").remove(paths as string[]);
      }
      // Borrar una meta cambia el denominador → recalcular puntos del usuario
      // en todos sus días con registro y propagar a las tablas.
      await recalcMyScores();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["goalsHistory"] });
      qc.invalidateQueries({ queryKey: ["memoriesList"] });
      qc.invalidateQueries({ queryKey: ["memoryCheckIds"] });
      qc.invalidateQueries({ queryKey: ["memoryCount"] });
      qc.invalidateQueries({ queryKey: ["pendingChecks"] });
      qc.invalidateQueries({ queryKey: ["pendingAudits"] });
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["dateChecks"] });
      qc.invalidateQueries({ queryKey: ["monthChecks"] });
      qc.invalidateQueries({ queryKey: ["todayScore"] });
      qc.invalidateQueries({ queryKey: ["myAudits"] });
      invalidateScoreQueries(qc);
    },
  });
}

export function useReorderGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const supabase = createClient();
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from("goals").update({ position: i + 1 } as never).eq("id", id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}
