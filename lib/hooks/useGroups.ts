"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GroupMemberWithProfile {
  user_id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface GroupWithMembers {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  members: GroupMemberWithProfile[];
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  position: number;
  is_leader: boolean;
}

export interface DailyScoreEntry {
  user_id: string;
  full_name: string | null;
  score_date: string;
  total_points: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
export { getInitials };

// ── Queries ────────────────────────────────────────────────────────────────

export function useMyGroups() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["groups", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<GroupWithMembers[]> => {
      const supabase = createClient();
      // Get groups the user belongs to
      type MembershipRow = { group_id: string };
      type GroupRow = { id: string; name: string; invite_code: string; owner_id: string };
      type MemberRow = { user_id: string; role: string };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };

      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id) as unknown as { data: MembershipRow[] | null };

      if (!memberships?.length) return [];

      const groupIds = memberships.map((m) => m.group_id);

      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, invite_code, owner_id")
        .in("id", groupIds) as unknown as { data: GroupRow[] | null };

      if (!groups?.length) return [];

      // For each group get members with profiles
      const result: GroupWithMembers[] = await Promise.all(
        groups.map(async (g) => {
          const { data: members } = await supabase
            .from("group_members")
            .select("user_id, role")
            .eq("group_id", g.id) as unknown as { data: MemberRow[] | null };

          const memberProfiles: GroupMemberWithProfile[] = await Promise.all(
            (members ?? []).map(async (m) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("id", m.user_id)
                .single() as unknown as { data: ProfileRow | null };
              return {
                user_id: m.user_id,
                role: m.role,
                full_name: profile?.full_name ?? null,
                avatar_url: profile?.avatar_url ?? null,
              };
            })
          );

          return { ...g, members: memberProfiles };
        })
      );

      return result;
    },
  });
}

export function useLeaderboard(groupId: string | null) {
  return useQuery({
    queryKey: ["leaderboard", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!groupId) return [];
      const supabase = createClient();

      type ScoreRow = { user_id: string; total_points: number | null };
      type ProfileRow2 = { full_name: string | null; avatar_url: string | null };

      // Sum total_points per user in this group
      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, total_points")
        .eq("group_id", groupId) as unknown as { data: ScoreRow[] | null };

      if (!data) return [];

      // Aggregate
      const totals: Record<string, number> = {};
      for (const row of data) {
        totals[row.user_id] = (totals[row.user_id] ?? 0) + (row.total_points ?? 0);
      }

      const userIds = Object.keys(totals);
      if (!userIds.length) return [];

      const profiles = await Promise.all(
        userIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", uid)
            .single() as unknown as { data: ProfileRow2 | null };
          return { user_id: uid, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null };
        })
      );

      const entries = profiles
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0 }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((p, i) => ({ ...p, position: i + 1, is_leader: i === 0 }));

      return entries;
    },
  });
}

export function useLast7Days(groupId: string | null) {
  return useQuery({
    queryKey: ["last7days", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<DailyScoreEntry[]> => {
      if (!groupId) return [];
      const supabase = createClient();

      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().split("T")[0];

      type DayRow = { user_id: string; score_date: string; total_points: number | null };
      type NameRow = { full_name: string | null };

      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, score_date, total_points")
        .eq("group_id", groupId)
        .gte("score_date", sinceStr)
        .order("score_date", { ascending: true }) as unknown as { data: DayRow[] | null };

      if (!data) return [];

      const userIds = Array.from(new Set(data.map((r) => r.user_id)));
      const profiles: Record<string, string | null> = {};
      await Promise.all(
        userIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", uid)
            .single() as unknown as { data: NameRow | null };
          profiles[uid] = p?.full_name ?? null;
        })
      );

      return data.map((r) => ({
        user_id: r.user_id,
        full_name: profiles[r.user_id] ?? null,
        score_date: r.score_date,
        total_points: r.total_points ?? 0,
      }));
    },
  });
}

export function calcDayPoints(
  checks: { kind: string }[],
  goals: { kind: string }[],
): number {
  const gymPts = checks.some((c) => c.kind === "gym") ? 3 : 0;
  const dietTotal = goals.filter((g) => g.kind === "diet").length;
  const dietDone = checks.filter((c) => c.kind === "diet").length;
  const goalTotal = goals.filter((g) => g.kind === "goal").length;
  const goalDone = checks.filter((c) => c.kind === "goal").length;
  const dietPts = dietTotal > 0 ? Math.floor((dietDone / dietTotal) * 5) : 0;
  const goalPts = goalTotal > 0 ? Math.floor((goalDone / goalTotal) * 5) : 0;
  return gymPts + dietPts + goalPts;
}

export function useTodayScore(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["todayScore", user?.id, groupId],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<number> => {
      if (!groupId) return 0;
      const supabase = createClient();
      const _d = new Date();
      const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
      type CheckRow = { kind: string };
      type GoalRow = { kind: string };
      const [{ data: checks }, { data: goals }] = await Promise.all([
        supabase.from("daily_checks").select("kind").eq("user_id", user!.id).eq("group_id", groupId).eq("check_date", today) as unknown as { data: CheckRow[] | null },
        supabase.from("goals").select("kind").eq("user_id", user!.id).eq("active", true) as unknown as { data: GoalRow[] | null },
      ]);
      return calcDayPoints(checks ?? [], goals ?? []);
    },
  });
}

export function useStreak(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["streak", user?.id, groupId],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<number> => {
      if (!groupId) return 0;
      const supabase = createClient();
      type CheckRow = { check_date: string };
      const { data } = await supabase
        .from("daily_checks")
        .select("check_date")
        .eq("user_id", user!.id)
        .eq("group_id", groupId)
        .order("check_date", { ascending: false }) as unknown as { data: CheckRow[] | null };

      if (!data?.length) return 0;

      const days = Array.from(new Set(data.map((r) => r.check_date))).sort().reverse();
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < days.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = `${expected.getFullYear()}-${String(expected.getMonth()+1).padStart(2,"0")}-${String(expected.getDate()).padStart(2,"0")}`;
        if (days[i] === expectedStr) streak++;
        else break;
      }
      return streak;
    },
  });
}

export function usePendingAudits(groupId: string | null) {
  return useQuery({
    queryKey: ["pendingAudits", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      if (!groupId) return 0;
      const supabase = createClient();
      const { count } = await supabase
        .from("daily_checks")
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .eq("status", "pending") as unknown as { count: number | null };
      return count ?? 0;
    },
  });
}

export interface WonWeek {
  id: string;
  start_date: string;
  end_date: string;
  group_id: string;
  group_name: string;
  total_points: number;
}

export interface ProfileStats {
  lifetimePoints: number;
  bestStreak: number;
  titlesCount: number;
  wonWeeks: WonWeek[];
}

export function useProfileStats() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["profileStats", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ProfileStats> => {
      const supabase = createClient();

      // Lifetime points — deduplicate by date to avoid multi-group inflation
      type ScoreRow = { score_date: string; total_points: number | null };
      const { data: scores } = await supabase
        .from("daily_scores")
        .select("score_date, total_points")
        .eq("user_id", user!.id) as unknown as { data: ScoreRow[] | null };

      const perDate: Record<string, number> = {};
      for (const row of scores ?? []) {
        perDate[row.score_date] = Math.max(perDate[row.score_date] ?? 0, row.total_points ?? 0);
      }
      const lifetimePoints = Object.values(perDate).reduce((a, b) => a + b, 0);

      // Best streak from daily_checks
      type CheckRow = { check_date: string };
      const { data: checks } = await supabase
        .from("daily_checks")
        .select("check_date")
        .eq("user_id", user!.id) as unknown as { data: CheckRow[] | null };

      const days = Array.from(new Set((checks ?? []).map((r) => r.check_date))).sort();
      let bestStreak = 0, cur = 0;
      for (let i = 0; i < days.length; i++) {
        if (i === 0) { cur = 1; }
        else {
          const prev = new Date(days[i - 1] + "T12:00:00");
          const curr = new Date(days[i] + "T12:00:00");
          const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
          cur = diff === 1 ? cur + 1 : 1;
        }
        bestStreak = Math.max(bestStreak, cur);
      }

      // Weeks won
      type WeekRow = { id: string; start_date: string; end_date: string; group_id: string };
      const { data: wonRaw } = await supabase
        .from("weeks")
        .select("id, start_date, end_date, group_id")
        .eq("winner_id", user!.id)
        .eq("status", "closed")
        .order("end_date", { ascending: false }) as unknown as { data: WeekRow[] | null };

      // Fetch group names for won weeks
      const groupIds = Array.from(new Set((wonRaw ?? []).map((w) => w.group_id)));
      type GroupRow = { id: string; name: string };
      const groupNames: Record<string, string> = {};
      if (groupIds.length) {
        const { data: gRows } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds) as unknown as { data: GroupRow[] | null };
        for (const g of gRows ?? []) groupNames[g.id] = g.name;
      }

      // Fetch total points for each won week (sum of winner's scores that week)
      const wonWeeks: WonWeek[] = await Promise.all(
        (wonRaw ?? []).map(async (w) => {
          type WkScore = { total_points: number | null };
          const { data: pts } = await supabase
            .from("daily_scores")
            .select("total_points")
            .eq("user_id", user!.id)
            .eq("group_id", w.group_id)
            .gte("score_date", w.start_date)
            .lte("score_date", w.end_date) as unknown as { data: WkScore[] | null };
          const total = (pts ?? []).reduce((s, r) => s + (r.total_points ?? 0), 0);
          return { ...w, group_name: groupNames[w.group_id] ?? "Grupo", total_points: total };
        })
      );

      return { lifetimePoints, bestStreak, titlesCount: wonWeeks.length, wonWeeks };
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateGroup() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<void> => {
      if (!user) throw new Error("No autenticado");
      const supabase = createClient();

      const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();

      // invite_code has a DB default; trigger handle_new_group auto-inserts
      // the owner into group_members and creates group_settings.
      // Avoid .select() after insert to prevent RLS race with the trigger.
      const { error } = await supabase
        .from("groups")
        .insert({ name, owner_id: user.id } as never) as unknown as { error: unknown };

      if (error) throw error;

      return;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLeaveGroup() {
  const { user } = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      if (!user) throw new Error("No autenticado");
      const supabase = createClient();
      await supabase.from("daily_scores").delete().eq("group_id", groupId).eq("user_id", user.id);
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id) as unknown as { error: unknown };
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useLookupGroup(code: string) {
  return useQuery({
    queryKey: ["groupLookup", code.trim().toUpperCase()],
    enabled: code.trim().length >= 4,
    retry: false,
    queryFn: async (): Promise<{ name: string; owner_name: string; member_count: number } | null> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("preview_group_by_code", {
        p_invite_code: code.trim(),
      });
      if (error || !data) return null;
      return data as { name: string; owner_name: string; member_count: number };
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string): Promise<{ id: string; name: string; owner_name: string }> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("join_group_by_code", {
        p_invite_code: inviteCode.trim(),
      });
      if (error) throw new Error(error.message ?? "Código inválido o grupo no encontrado");
      return data as { id: string; name: string; owner_name: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
