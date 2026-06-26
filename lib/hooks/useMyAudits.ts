"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "./useProfile";
import { useUser } from "./useUser";

export interface MyAuditEntry {
  audit_id: string;
  vote: string;
  reason: string | null;
  audit_created_at: string;
  check_id: string;
  check_status: string;
  check_date: string;
  check_kind: string;
  check_evidence_path: string;
  check_goal_id: string | null;
  check_group_id: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  goal_title: string | null;
}

export function useMyAudits() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["myAudits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyAuditEntry[]> => {
      const supabase = createClient();

      // 1. Fetch all audits I've done (latest first for deduplication)
      type AuditRow = { id: string; check_id: string; vote: string; reason: string | null; created_at: string };
      const { data: audits } = await supabase
        .from("audits")
        .select("id, check_id, vote, reason, created_at")
        .eq("reviewer_id", user!.id)
        .order("created_at", { ascending: false }) as unknown as { data: AuditRow[] | null };

      if (!audits?.length) return [];

      // 2. Keep only the latest audit per check_id
      const latestPerCheck = new Map<string, AuditRow>();
      for (const a of audits) {
        if (!latestPerCheck.has(a.check_id)) latestPerCheck.set(a.check_id, a);
      }
      const checkIds = Array.from(latestPerCheck.keys());

      // 3. Fetch check details
      type CheckRow = {
        id: string;
        user_id: string;
        group_id: string;
        kind: string;
        check_date: string;
        evidence_path: string;
        status: string;
        goal_id: string | null;
      };
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("id, user_id, group_id, kind, check_date, evidence_path, status, goal_id")
        .in("id", checkIds) as unknown as { data: CheckRow[] | null };

      if (!checks?.length) return [];

      // 4. Fetch owner profiles
      const ownerIds = Array.from(new Set(checks.map((c) => c.user_id)));
      type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ownerIds) as unknown as { data: ProfileRow[] | null };

      // 5. Fetch goal titles
      const goalIds = Array.from(new Set(checks.filter((c) => c.goal_id).map((c) => c.goal_id!)));
      type GoalRow = { id: string; title: string };
      const { data: goals } = goalIds.length
        ? await supabase
            .from("goals")
            .select("id, title")
            .in("id", goalIds) as unknown as { data: GoalRow[] | null }
        : { data: null };

      // 6. Build merged list
      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const goalMap = new Map((goals ?? []).map((g) => [g.id, g.title]));
      const checkMap = new Map(checks.map((c) => [c.id, c]));

      const result: MyAuditEntry[] = [];
      for (const [checkId, audit] of Array.from(latestPerCheck.entries())) {
        const check = checkMap.get(checkId);
        if (!check) continue;
        const owner = profileMap.get(check.user_id);
        result.push({
          audit_id: audit.id,
          vote: audit.vote,
          reason: audit.reason,
          audit_created_at: audit.created_at,
          check_id: checkId,
          check_status: check.status,
          check_date: check.check_date,
          check_kind: check.kind,
          check_evidence_path: check.evidence_path,
          check_goal_id: check.goal_id,
          check_group_id: check.group_id,
          owner_id: check.user_id,
          owner_name: owner?.full_name ?? null,
          owner_avatar: owner?.avatar_url ?? null,
          goal_title: check.goal_id ? (goalMap.get(check.goal_id) ?? null) : null,
        });
      }

      // Sort: re-submitted (pending) first, then by date descending
      result.sort((a, b) => {
        const aResub = a.check_status === "pending" ? 1 : 0;
        const bResub = b.check_status === "pending" ? 1 : 0;
        if (aResub !== bResub) return bResub - aResub;
        return b.check_date.localeCompare(a.check_date);
      });

      return result;
    },
  });
}

export function useResubmitCheck() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkId,
      checkDate,
      kind,
      goalId,
      file,
      oldEvidencePath,
    }: {
      checkId: string;
      checkDate: string;
      kind: string;
      goalId?: string | null;
      file: File;
      oldEvidencePath?: string | null;
    }) => {
      if (!user) throw new Error("Sin sesión");

      const compressed = await compressImage(file, 1080);
      const path = `${user.id}/${checkDate}/${kind}${goalId ? `-${goalId}` : ""}_${Date.now()}.jpg`;

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(path, compressed);

      if (uploadError) throw uploadError;

      const res = await fetch("/api/checks/resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkId, evidencePath: path, oldEvidencePath: oldEvidencePath ?? null }),
      });

      if (!res.ok) throw new Error("Error al reenviar evidencia");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["todayChecks"] });
      qc.invalidateQueries({ queryKey: ["dateChecks"] });
      qc.invalidateQueries({ queryKey: ["monthChecks"] });
      qc.invalidateQueries({ queryKey: ["myAudits"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["globalLeaderboard"] });
      qc.invalidateQueries({ queryKey: ["seasonLeaderboard"] });
      qc.invalidateQueries({ queryKey: ["seasonStandings"] });
      qc.invalidateQueries({ queryKey: ["todayScore"] });
    },
  });
}
