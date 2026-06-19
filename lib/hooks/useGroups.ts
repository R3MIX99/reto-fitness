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

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateGroup() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (name: string): Promise<string> => {
      if (!user) throw new Error("No autenticado");
      const supabase = createClient();

      const invite_code = Math.random().toString(36).slice(2, 8).toUpperCase();

      // invite_code has a DB default; trigger handle_new_group auto-inserts
      // the owner into group_members and creates group_settings on insert.
      const { data: group, error } = await supabase
        .from("groups")
        .insert({ name, owner_id: user.id } as never)
        .select("id")
        .single() as unknown as { data: { id: string } | null; error: unknown };

      if (error || !group) throw error ?? new Error("Error al crear grupo");

      return group.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useJoinGroup() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string): Promise<string> => {
      if (!user) throw new Error("No autenticado");
      const supabase = createClient();

      const { data: group, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", inviteCode.toUpperCase())
        .single() as unknown as { data: { id: string; name: string } | null; error: unknown };

      if (error || !group) throw new Error("Código inválido o grupo no encontrado");

      const { error: joinError } = await supabase
        .from("group_members")
        .insert({ group_id: group.id, user_id: user.id, role: "member" } as never) as unknown as { error: { code?: string } | null };

      if (joinError && joinError.code !== "23505") throw joinError;

      return group.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
