"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { compressImage } from "./useProfile";

// ── Types ──────────────────────────────────────────────────────────────────

export type GoalKind = "gym" | "diet" | "goal";

export interface Goal {
  id: string;
  title: string;
  kind: GoalKind;
  position: number;
  icon: string | null;
  reminder_at: string | null;
  active: boolean;
  group_id: string | null;
}

export interface DailyCheck {
  id: string;
  goal_id: string | null;
  kind: string;
  check_date: string;
  status: string;
  evidence_path: string;
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
      type GoalRow = { id: string; title: string; kind: string; position: number; icon: string | null; reminder_at: string | null; active: boolean; group_id: string | null };
      const { data } = await supabase
        .from("goals")
        .select("id, title, kind, position, icon, reminder_at, active, group_id")
        .eq("user_id", user!.id)
        .eq("active", true)
        .order("position", { ascending: true }) as unknown as { data: GoalRow[] | null };

      return (data ?? []) as Goal[];
    },
  });
}

export function useDateChecks(groupId: string | null, date: string) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["dateChecks", user?.id, groupId, date],
    enabled: !!user && !!groupId && !!date,
    queryFn: async (): Promise<DailyCheck[]> => {
      const supabase = createClient();
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, group_id, created_at")
        .eq("user_id", user!.id)
        .eq("group_id", groupId!)
        .eq("check_date", date) as unknown as { data: CheckRow[] | null };
      return (data ?? []) as DailyCheck[];
    },
  });
}

export function useTodayChecks(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["todayChecks", user?.id, groupId],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<DailyCheck[]> => {
      const supabase = createClient();
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, group_id, created_at")
        .eq("user_id", user!.id)
        .eq("group_id", groupId!)
        .eq("check_date", todayStr()) as unknown as { data: CheckRow[] | null };
      return (data ?? []) as DailyCheck[];
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
      type CheckRow = { id: string; goal_id: string | null; kind: string; check_date: string; status: string; evidence_path: string; group_id: string; created_at: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("id, goal_id, kind, check_date, status, evidence_path, group_id, created_at")
        .eq("user_id", user!.id)
        .eq("group_id", groupId!)
        .gte("check_date", monthStart())
        .lte("check_date", monthEnd()) as unknown as { data: CheckRow[] | null };
      return (data ?? []) as DailyCheck[];
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useMarkCheck(groupId: string | null) {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, kind, goalId }: { file: File; kind: GoalKind; goalId?: string }) => {
      if (!user || !groupId) throw new Error("Sin sesión o grupo");

      const compressed = await compressImage(file, 1080);
      const ext = "jpg";
      const path = `${user.id}/${todayStr()}/${kind}${goalId ? `-${goalId}` : ""}.${ext}`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(path, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      // Delete any existing check for this slot first (handles re-uploads cleanly)
      const deleteQuery = supabase
        .from("daily_checks")
        .delete()
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .eq("check_date", todayStr())
        .eq("kind", kind);

      if (goalId) {
        await (deleteQuery.eq("goal_id", goalId) as unknown as Promise<unknown>);
      } else {
        await (deleteQuery.is("goal_id", null) as unknown as Promise<unknown>);
      }

      const { error: insertError } = await supabase
        .from("daily_checks")
        .insert({
          user_id: user.id,
          group_id: groupId,
          kind,
          goal_id: goalId ?? null,
          evidence_path: path,
          check_date: todayStr(),
          status: "pending",
        } as never) as unknown as { error: { message: string } | null };

      if (insertError) throw new Error((insertError as { message: string }).message);

      // Recalculate day score so leaderboard updates immediately
      await (supabase.rpc as Function)("recalc_day_score", {
        p_user_id: user.id,
        p_group_id: groupId,
        p_date: todayStr(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["monthChecks"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["todayScore"] });
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
          .update({ title: goal.title, icon: goal.icon ?? null, reminder_at: goal.reminder_at ?? null } as never)
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
          .insert({ user_id: user.id, kind: goal.kind, title: goal.title, position, icon: goal.icon ?? null, group_id: goal.group_id ?? null } as never) as unknown as { error: { message: string } | null };
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
