"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { notifyUser } from "@/lib/notify";

export interface PendingCheck {
  id: string;
  user_id: string;
  group_id: string;
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

export function usePendingChecks(groupIds: string[]) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["pendingChecks", groupIds],
    enabled: !!user && groupIds.length > 0,
    queryFn: async (): Promise<PendingCheck[]> => {
      if (!groupIds.length) return [];
      const supabase = createClient();

      type CheckRow = {
        id: string;
        user_id: string;
        kind: string;
        check_date: string;
        evidence_path: string;
        goal_id: string | null;
        group_id: string;
      };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };
      type GoalRow = { title: string };

      // All pending checks this week across all groups, excluding own checks
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("id, user_id, kind, check_date, evidence_path, goal_id, group_id")
        .in("group_id", groupIds)
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
            group_id: c.group_id,
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

export function useAutoApproveOldChecks(groupIds: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!groupIds.length) return;
      const supabase = createClient();
      await Promise.all(
        groupIds.map((id) =>
          (supabase.rpc as Function)("auto_approve_old_checks", { p_group_id: id })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingChecks"] });
      qc.invalidateQueries({ queryKey: ["pendingAudits"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}

export function useAuditCheck() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkId,
      approved,
      reason,
      checkUserId,
      checkDate,
      checkGroupId,
      checkKind,
      reviewerName,
    }: {
      checkId: string;
      approved: boolean;
      reason?: string | null;
      checkUserId: string;
      checkDate: string;
      checkGroupId: string;
      checkKind?: string;
      reviewerName?: string | null;
    }) => {
      if (!user) throw new Error("Sin sesión");
      const supabase = createClient();

      // Snapshot leaderboard BEFORE recalc to detect ranking changes
      type ScoreRow = { user_id: string; total_points: number | null };
      const { data: scoreBefore } = await supabase
        .from("daily_scores")
        .select("user_id, total_points")
        .eq("group_id", checkGroupId) as unknown as { data: ScoreRow[] | null };

      const totalsBefore: Record<string, number> = {};
      for (const r of scoreBefore ?? []) {
        totalsBefore[r.user_id] = (totalsBefore[r.user_id] ?? 0) + (r.total_points ?? 0);
      }

      const { error } = await supabase
        .from("daily_checks")
        .update({ status: approved ? "approved" : "rejected" } as never)
        .eq("id", checkId) as unknown as { error: unknown };

      if (error) throw error;

      // Record the audit vote (with optional reason)
      await supabase.from("audits").insert({
        check_id: checkId,
        reviewer_id: user.id,
        vote: approved ? "approved" : "rejected",
        reason: reason ?? null,
      } as never);

      // Recalculate score for the audited user
      await (supabase.rpc as Function)("recalc_day_score", {
        p_user_id: checkUserId,
        p_group_id: checkGroupId,
        p_date: checkDate,
      });

      // ── Fire notifications (best-effort, don't await sequentially) ──────

      const auditorName = reviewerName ?? "Un compañero";
      const kindLabel = checkKind === "gym" ? "de gimnasio" : checkKind === "diet" ? "de dieta" : "de meta";

      // 1. Notify the check owner about the result
      notifyUser({
        user_id: checkUserId,
        type: "review_done",
        title: approved ? "Evidencia aprobada ✓" : "Evidencia rechazada",
        body: approved
          ? `${auditorName} aprobó tu evidencia ${kindLabel}.`
          : `${auditorName} rechazó tu evidencia ${kindLabel}${reason ? `: "${reason}"` : "."}`,
        url: "/checklist",
        metadata: { check_id: checkId, approved },
      });

      // 2. Detect ranking change if approved (points increased)
      if (approved) {
        const { data: scoreAfter } = await supabase
          .from("daily_scores")
          .select("user_id, total_points")
          .eq("group_id", checkGroupId) as unknown as { data: ScoreRow[] | null };

        const totalsAfter: Record<string, number> = {};
        for (const r of scoreAfter ?? []) {
          totalsAfter[r.user_id] = (totalsAfter[r.user_id] ?? 0) + (r.total_points ?? 0);
        }

        const pointsBefore = totalsBefore[checkUserId] ?? 0;
        const pointsAfter  = totalsAfter[checkUserId] ?? 0;

        if (pointsAfter > pointsBefore) {
          // Find users that checkUserId surpassed
          for (const [uid, ptsBefore] of Object.entries(totalsBefore)) {
            if (uid === checkUserId) continue;
            const ptsAfter = totalsAfter[uid] ?? ptsBefore;
            // uid was ahead before but is now behind or equal
            if (ptsBefore >= pointsBefore && ptsAfter < pointsAfter) {
              // Get surpassed user's name for message
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", checkUserId)
                .single() as unknown as { data: { full_name: string | null } | null };
              const surpasserName = profile?.full_name ?? "Un jugador";

              notifyUser({
                user_id: uid,
                type: "ranking_passed",
                title: "Te superaron en el ranking",
                body: `${surpasserName} ahora tiene más puntos que tú esta semana.`,
                url: "/grupo",
                metadata: { group_id: checkGroupId, surpasser_id: checkUserId },
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingChecks"] });
      qc.invalidateQueries({ queryKey: ["pendingAudits"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
