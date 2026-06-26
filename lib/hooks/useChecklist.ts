"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { compressImage } from "./useProfile";

// ── Types ──────────────────────────────────────────────────────────────────

export type GoalKind = "gym" | "diet" | "goal";

// Metas personalizables (Pro/Elite): módulos de evidencia opcionales.
export type GoalModule = "timer" | "summary";
export interface GoalConfig {
  modules: GoalModule[];
  timer_minutes?: number;
}
export interface CheckEvidence {
  summary?: string;
  timer_seconds?: number;
}

export function hasModules(goal: Goal): boolean {
  return !!goal.config && Array.isArray(goal.config.modules) && goal.config.modules.length > 0;
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

export function useGoals() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["goals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Goal[]> => {
      const supabase = createClient();
      type GoalRow = { id: string; title: string; kind: string; position: number; icon: string | null; reminder_at: string | null; active: boolean; group_id: string | null; config: GoalConfig | null };
      const { data } = await supabase
        .from("goals")
        .select("id, title, kind, position, icon, reminder_at, active, group_id, config")
        .eq("user_id", user!.id)
        .eq("active", true)
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

// ── Mutations ──────────────────────────────────────────────────────────────

export function useMarkCheck(groupId: string | null) {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    // Optimistic update: muestra el check como "pending" al instante, antes de que
    // el servidor responda. Si falla, revierte al estado anterior.
    onMutate: async ({ kind, goalId }: { file: File; kind: GoalKind; goalId?: string; evidence?: CheckEvidence }) => {
      if (!user || !groupId) return;
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

    mutationFn: async ({ file, kind, goalId, evidence }: { file: File; kind: GoalKind; goalId?: string; evidence?: CheckEvidence }) => {
      if (!user || !groupId) throw new Error("Sin sesión o grupo");

      // La evidencia es UNA sola foto, compartida por todos los grupos del usuario:
      // la ruta no incluye group_id, así que el archivo nunca se duplica.
      const compressed = await compressImage(file, 1080);
      const ext = "jpg";
      const path = `${user.id}/${todayStr()}/${kind}${goalId ? `-${goalId}` : ""}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(path, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      // Un check es personal: aplica a TODOS los grupos del usuario. Creamos una
      // fila por grupo (mismo archivo) para que cada grupo lo revise y puntúe por
      // separado, sin duplicar la evidencia.
      type MembershipRow = { group_id: string };
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id) as unknown as { data: MembershipRow[] | null };

      const groupIds = (memberships ?? []).map((m) => m.group_id);
      // Garantizar que el grupo activo siempre esté incluido aunque haya lag de lectura
      if (!groupIds.includes(groupId)) groupIds.push(groupId);

      for (const gid of groupIds) {
        // Borrar check previo del mismo slot en este grupo (maneja re-subidas)
        const deleteQuery = supabase
          .from("daily_checks")
          .delete()
          .eq("user_id", user.id)
          .eq("group_id", gid)
          .eq("check_date", todayStr())
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
            user_id: user.id,
            group_id: gid,
            kind,
            goal_id: goalId ?? null,
            evidence_path: path,
            evidence: evidence ?? null,
            check_date: todayStr(),
            status: "pending",
          } as never) as unknown as { error: { message: string } | null };

        if (insertError) throw new Error((insertError as { message: string }).message);

        // Recalcular puntos del día en cada grupo para que su leaderboard se actualice
        await (supabase.rpc as Function)("recalc_day_score", {
          p_user_id: user.id,
          p_group_id: gid,
          p_date: todayStr(),
        });
        await (supabase.rpc as Function)("compute_user_streak", {
          p_user_id: user.id,
          p_group_id: gid,
        });
      }
    },

    onError: (_err, _vars, context) => {
      // Revertir al estado previo si el upload falló
      if (context?.prev !== undefined) {
        qc.setQueryData(context.queryKey, context.prev);
      }
    },

    // Tanto en éxito como en error: sincronizar con el servidor
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["monthChecks"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["todayScore"] });
      qc.invalidateQueries({ queryKey: ["streak"] });
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
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const { user } = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      await supabase.from("goals").update({ active: false } as never).eq("id", id) as unknown as { error: unknown };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
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
