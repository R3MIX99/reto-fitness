"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export interface PendingCheck {
  id: string;
  user_id: string;
  kind: string;
  check_date: string;
  evidence_path: string;
  goal_title: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return localDateStr(d);
}

function weekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return localDateStr(d);
}

function kindLabel(kind: string, goalTitle: string | null): string {
  if (kind === "gym") return "Gimnasio";
  if (kind === "diet") return `Dieta · ${goalTitle ?? "Comida"}`;
  if (kind === "goal") return `Meta · ${goalTitle ?? "Meta"}`;
  return kind;
}

export { kindLabel, getWeekNumber };

export function usePendingChecks(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["pendingChecks", groupId],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<PendingCheck[]> => {
      if (!groupId) return [];
      const supabase = createClient();

      type CheckRow = {
        id: string;
        user_id: string;
        kind: string;
        check_date: string;
        evidence_path: string;
        goal_id: string | null;
      };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };
      type GoalRow = { title: string };

      // All pending checks this week that don't belong to the current user
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("id, user_id, kind, check_date, evidence_path, goal_id")
        .eq("group_id", groupId)
        .eq("status", "pending")
        .neq("user_id", user!.id)
        .gte("check_date", weekStart())
        .lte("check_date", weekEnd())
        .order("check_date", { ascending: false }) as unknown as { data: CheckRow[] | null };

      if (!checks?.length) return [];

      return Promise.all(
        checks.map(async (c) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", c.user_id)
            .single() as unknown as { data: ProfileRow | null };

          let goal_title: string | null = null;
          if (c.goal_id) {
            const { data: goal } = await supabase
              .from("goals")
              .select("title")
              .eq("id", c.goal_id)
              .single() as unknown as { data: GoalRow | null };
            goal_title = goal?.title ?? null;
          }

          return {
            id: c.id,
            user_id: c.user_id,
            kind: c.kind,
            check_date: c.check_date,
            evidence_path: c.evidence_path,
            goal_title,
            full_name: profile?.full_name ?? null,
            avatar_url: profile?.avatar_url ?? null,
          };
        })
      );
    },
  });
}

export function useAutoApproveOldChecks(groupId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!groupId) return;
      await (createClient().rpc as Function)("auto_approve_old_checks", { p_group_id: groupId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingChecks"] });
      qc.invalidateQueries({ queryKey: ["pendingAudits"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useAuditCheck(groupId: string | null) {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkId,
      approved,
      checkUserId,
      checkDate,
    }: {
      checkId: string;
      approved: boolean;
      checkUserId: string;
      checkDate: string;
    }) => {
      if (!user || !groupId) throw new Error("Sin sesión");
      const supabase = createClient();

      const { error } = await supabase
        .from("daily_checks")
        .update({ status: approved ? "approved" : "rejected" } as never)
        .eq("id", checkId) as unknown as { error: unknown };

      if (error) throw error;

      // Recalculate the audited user's score for that day
      await (supabase.rpc as Function)("recalc_day_score", {
        p_user_id: checkUserId,
        p_group_id: groupId,
        p_date: checkDate,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingChecks"] });
      qc.invalidateQueries({ queryKey: ["pendingAudits"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
