"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

// Realtime: refresca grupos/membresías/transferencias al instante para todos los
// involucrados (p. ej. al transferir, el dueño anterior deja de ser dueño sin
// recargar). Montar una vez en pantallas de grupo/dashboard.
export function useGroupsRealtime() {
  const { user } = useUser();
  const qc = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const invalidateGroups = () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["activeSeason"] });
      qc.invalidateQueries({ queryKey: ["myPlan"] });
    };
    const invalidateTransfers = () => {
      qc.invalidateQueries({ queryKey: ["incomingTransfers"] });
      qc.invalidateQueries({ queryKey: ["outgoingTransfer"] });
      invalidateGroups();
    };

    const channel = supabase
      .channel(`groups-rt-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, invalidateGroups)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, invalidateGroups)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_transfers" }, invalidateTransfers)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);
}

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
  streak_day: number;
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

      type ScoreRow = { user_id: string; total_points: number | null; streak_bonus: number | null; streak_day: number | null; score_date: string };
      type ProfileRow2 = { full_name: string | null; avatar_url: string | null };

      const _ld = new Date();
      const todayLd = `${_ld.getFullYear()}-${String(_ld.getMonth()+1).padStart(2,"0")}-${String(_ld.getDate()).padStart(2,"0")}`;

      // Sum (total_points + streak_bonus) per user in this group
      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, total_points, streak_bonus, streak_day, score_date")
        .eq("group_id", groupId) as unknown as { data: ScoreRow[] | null };

      if (!data) return [];

      // Aggregate effective points; track today's streak_day per user
      const totals: Record<string, number> = {};
      const streakDaysLb: Record<string, number> = {};
      for (const row of data) {
        const effective = (row.total_points ?? 0) + (row.streak_bonus ?? 0);
        totals[row.user_id] = (totals[row.user_id] ?? 0) + effective;
        if (row.score_date === todayLd) streakDaysLb[row.user_id] = row.streak_day ?? 0;
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
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0, streak_day: streakDaysLb[p.user_id] ?? 0 }))
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
        supabase.from("daily_checks").select("kind").eq("user_id", user!.id).eq("group_id", groupId).eq("check_date", today).neq("status", "rejected") as unknown as { data: CheckRow[] | null },
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
      if (!groupId || !user) return 0;
      const supabase = createClient();
      const _d = new Date();
      const todayStr = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
      type Row = { streak_day: number | null };
      const { data } = await supabase
        .from("daily_scores")
        .select("streak_day")
        .eq("user_id", user.id)
        .eq("group_id", groupId)
        .eq("score_date", todayStr)
        .single() as unknown as { data: Row | null };
      return data?.streak_day ?? 0;
    },
  });
}

export function usePendingAudits(groupIds: string[]) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["pendingAudits", groupIds],
    enabled: groupIds.length > 0 && !!user,
    queryFn: async () => {
      if (!groupIds.length || !user) return 0;
      const supabase = createClient();

      // Todos los checks pendientes del grupo, excluyendo los propios.
      // (Los pre-temporada se muestran con aviso en la UI pero sí se pueden revisar)
      const { data } = await supabase
        .from("daily_checks")
        .select("id")
        .in("group_id", groupIds)
        .eq("status", "pending")
        .neq("user_id", user.id) as unknown as { data: { id: string }[] | null };

      return (data ?? []).length;
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
        .insert({ name, owner_id: user.id } as never) as unknown as { error: { message: string } | null };

      if (error) throw new Error(error.message);

      return;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["myPlan"] });
    },
  });
}

// Salir de un grupo. El RPC bloquea salir si es tu único grupo o si eres el dueño.
export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("leave_group", { p_group_id: groupId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

// Borrar un grupo por completo (solo dueño, no el último). Cascade borra todo.
export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("delete_group", { p_group_id: groupId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["myPlan"] });
    },
  });
}

// Solicitar transferencia de propiedad a un miembro (dura 48 h).
export function useTransferGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, toUserId }: { groupId: string; toUserId: string }): Promise<void> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("request_group_transfer", {
        p_group_id: groupId,
        p_to_user: toUserId,
      });
      if (error) throw new Error(error.message);
      // Push al destinatario (best-effort); el in-app lo genera el RPC
      fetch("/api/transfers/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: data as string, event: "requested" }),
      }).catch(() => {});
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["incomingTransfers"] });
      qc.invalidateQueries({ queryKey: ["outgoingTransfer", vars.groupId] });
    },
  });
}

export interface IncomingTransfer {
  id: string;
  group_id: string;
  group_name: string;
  from_name: string | null;
  member_count: number;
  expires_at: string;
}

// Transferencias de propiedad pendientes dirigidas al usuario actual (no vencidas).
export function useIncomingTransfers() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["incomingTransfers", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async (): Promise<IncomingTransfer[]> => {
      const supabase = createClient();
      type Row = { id: string; group_id: string; from_user: string; expires_at: string };
      const { data } = await supabase
        .from("group_transfers")
        .select("id, group_id, from_user, expires_at")
        .eq("to_user", user!.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString()) as unknown as { data: Row[] | null };

      const rows = data ?? [];
      if (!rows.length) return [];

      return Promise.all(
        rows.map(async (r) => {
          const { data: g } = await supabase.from("groups").select("name").eq("id", r.group_id).single() as unknown as { data: { name: string } | null };
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", r.from_user).single() as unknown as { data: { full_name: string | null } | null };
          const { count } = await supabase.from("group_members").select("user_id", { count: "exact", head: true }).eq("group_id", r.group_id) as unknown as { count: number | null };
          return {
            id: r.id,
            group_id: r.group_id,
            group_name: g?.name ?? "Grupo",
            from_name: p?.full_name ?? null,
            member_count: count ?? 0,
            expires_at: r.expires_at,
          };
        })
      );
    },
  });
}

// Aceptar o rechazar una transferencia de propiedad.
export function useRespondTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ transferId, accept }: { transferId: string; accept: boolean }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("respond_group_transfer", {
        p_transfer_id: transferId,
        p_accept: accept,
      });
      if (error) throw new Error(error.message);
      // Push al dueño anterior (best-effort); el in-app lo genera el RPC
      fetch("/api/transfers/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId, event: accept ? "accepted" : "rejected" }),
      }).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incomingTransfers"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export interface OutgoingTransfer {
  id: string;
  to_name: string | null;
  to_avatar: string | null;
  created_at: string;
  expires_at: string;
}

// Transferencia pendiente que el usuario (dueño) envió para un grupo. Para el banner.
export function useOutgoingTransfer(groupId: string | null) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["outgoingTransfer", groupId, user?.id],
    enabled: !!user && !!groupId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<OutgoingTransfer | null> => {
      const supabase = createClient();
      type Row = { id: string; to_user: string; created_at: string; expires_at: string };
      const { data } = await supabase
        .from("group_transfers")
        .select("id, to_user, created_at, expires_at")
        .eq("group_id", groupId!)
        .eq("from_user", user!.id)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as { data: Row | null };
      if (!data) return null;
      const { data: p } = await supabase
        .from("profiles").select("full_name, avatar_url").eq("id", data.to_user).single() as unknown as { data: { full_name: string | null; avatar_url: string | null } | null };
      return { id: data.id, to_name: p?.full_name ?? null, to_avatar: p?.avatar_url ?? null, created_at: data.created_at, expires_at: data.expires_at };
    },
  });
}

// Plan mínimo requerido para un grupo según su número de miembros (informativo).
// La validación real del tier se conecta en la Fase 3 (suscripciones).
export function planRequiredForMembers(memberCount: number): { tier: "free" | "pro" | "elite"; label: string; cost: string } {
  if (memberCount <= 5) return { tier: "free", label: "Free", cost: "$0" };
  if (memberCount <= 49) return { tier: "pro", label: "Pro", cost: "$99 MXN/mes" };
  return { tier: "elite", label: "Elite", cost: "$199 MXN/mes" };
}

export function useLookupGroup(code: string) {
  return useQuery({
    queryKey: ["groupLookup", code.trim().toLowerCase()],
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

// ── Global leaderboard (all groups the user belongs to) ────────────────────
// Points are deduplicated by date: a user's best score on a given day across
// all groups counts once, so multi-group membership doesn't inflate scores.

export function useGlobalLeaderboard(groupIds: string[]) {
  return useQuery({
    queryKey: ["globalLeaderboard", groupIds],
    enabled: groupIds.length > 0,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!groupIds.length) return [];
      const supabase = createClient();

      type ScoreRow = { user_id: string; score_date: string; total_points: number | null; streak_bonus: number | null; streak_day: number | null };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };

      const _gd = new Date();
      const todayGd = `${_gd.getFullYear()}-${String(_gd.getMonth()+1).padStart(2,"0")}-${String(_gd.getDate()).padStart(2,"0")}`;

      // Fetch all scores for all groups this user belongs to
      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, score_date, total_points, streak_bonus, streak_day")
        .in("group_id", groupIds) as unknown as { data: ScoreRow[] | null };

      if (!data?.length) return [];

      // For each user, deduplicate by date (take max effective across groups for that date)
      const perUserPerDate: Record<string, Record<string, number>> = {};
      const streakDaysGl: Record<string, number> = {};
      for (const row of data) {
        const uid = row.user_id;
        const date = row.score_date;
        const effective = (row.total_points ?? 0) + (row.streak_bonus ?? 0);
        if (!perUserPerDate[uid]) perUserPerDate[uid] = {};
        perUserPerDate[uid][date] = Math.max(perUserPerDate[uid][date] ?? 0, effective);
        if (date === todayGd && (row.streak_day ?? 0) > (streakDaysGl[uid] ?? 0)) {
          streakDaysGl[uid] = row.streak_day ?? 0;
        }
      }

      // Sum deduplicated points per user
      const totals: Record<string, number> = {};
      for (const [uid, dates] of Object.entries(perUserPerDate)) {
        totals[uid] = Object.values(dates).reduce((a, b) => a + b, 0);
      }

      const userIds = Object.keys(totals);

      // Collect all unique member profiles from all groups (members table)
      // then fall back to profiles table for any missing
      const { data: members } = await supabase
        .from("group_members")
        .select("user_id")
        .in("group_id", groupIds) as unknown as { data: { user_id: string }[] | null };

      const allUserIds = Array.from(new Set([...userIds, ...(members ?? []).map((m) => m.user_id)]));

      const profiles = await Promise.all(
        allUserIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", uid)
            .single() as unknown as { data: ProfileRow | null };
          return { user_id: uid, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null };
        })
      );

      const entries = profiles
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0, streak_day: streakDaysGl[p.user_id] ?? 0 }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((p, i) => ({ ...p, position: i + 1, is_leader: i === 0 }));

      return entries;
    },
  });
}

// ── Global leaderboard para los miembros de un grupo (sin temporada activa) ──
// Toma los IDs de los miembros, suma sus puntos en TODOS sus grupos y deduplica
// por fecha (el mejor score del día cuenta una sola vez).
export function useGroupMembersGlobalLeaderboard(memberIds: string[]) {
  const key = memberIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["groupMembersGlobalLeaderboard", key],
    enabled: memberIds.length > 0,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!memberIds.length) return [];
      const supabase = createClient();
      type ScoreRow = { user_id: string; score_date: string; total_points: number | null; streak_bonus: number | null; streak_day: number | null };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };

      const _md = new Date();
      const todayMd = `${_md.getFullYear()}-${String(_md.getMonth()+1).padStart(2,"0")}-${String(_md.getDate()).padStart(2,"0")}`;

      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, score_date, total_points, streak_bonus, streak_day")
        .in("user_id", memberIds) as unknown as { data: ScoreRow[] | null };

      // Deduplicar por (usuario, fecha) → tomar el máximo entre grupos
      const perUserPerDate: Record<string, Record<string, number>> = {};
      const streakDaysMb: Record<string, number> = {};
      for (const row of data ?? []) {
        const uid = row.user_id;
        const date = row.score_date;
        const effective = (row.total_points ?? 0) + (row.streak_bonus ?? 0);
        if (!perUserPerDate[uid]) perUserPerDate[uid] = {};
        perUserPerDate[uid][date] = Math.max(perUserPerDate[uid][date] ?? 0, effective);
        if (date === todayMd && (row.streak_day ?? 0) > (streakDaysMb[uid] ?? 0)) {
          streakDaysMb[uid] = row.streak_day ?? 0;
        }
      }

      const totals: Record<string, number> = {};
      for (const [uid, dates] of Object.entries(perUserPerDate)) {
        totals[uid] = Object.values(dates).reduce((a, b) => a + b, 0);
      }

      const profiles = await Promise.all(
        memberIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", uid)
            .single() as unknown as { data: ProfileRow | null };
          return { user_id: uid, full_name: p?.full_name ?? null, avatar_url: p?.avatar_url ?? null };
        })
      );

      return profiles
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0, streak_day: streakDaysMb[p.user_id] ?? 0 }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((p, i) => ({ ...p, position: i + 1, is_leader: i === 0 }));
    },
  });
}

// ── Últimos 7 días globales para los miembros de un grupo (sin temporada) ────
export function useGroupMembersGlobalLast7Days(memberIds: string[]) {
  const key = memberIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["groupMembersGlobalLast7Days", key],
    enabled: memberIds.length > 0,
    queryFn: async (): Promise<DailyScoreEntry[]> => {
      if (!memberIds.length) return [];
      const supabase = createClient();

      const since = new Date();
      since.setDate(since.getDate() - 6);
      const sinceStr = since.toISOString().split("T")[0];

      type ScoreRow = { user_id: string; score_date: string; total_points: number | null };

      const { data } = await supabase
        .from("daily_scores")
        .select("user_id, score_date, total_points")
        .in("user_id", memberIds)
        .gte("score_date", sinceStr) as unknown as { data: ScoreRow[] | null };

      // Deduplicar por (usuario, fecha)
      const perUserPerDate: Record<string, Record<string, number>> = {};
      for (const row of data ?? []) {
        const uid = row.user_id;
        const date = row.score_date;
        const pts = row.total_points ?? 0;
        if (!perUserPerDate[uid]) perUserPerDate[uid] = {};
        perUserPerDate[uid][date] = Math.max(perUserPerDate[uid][date] ?? 0, pts);
      }

      const profiles: Record<string, string | null> = {};
      await Promise.all(
        memberIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", uid)
            .single() as unknown as { data: { full_name: string | null } | null };
          profiles[uid] = p?.full_name ?? null;
        })
      );

      const rows: DailyScoreEntry[] = [];
      for (const [uid, dates] of Object.entries(perUserPerDate)) {
        for (const [date, pts] of Object.entries(dates)) {
          rows.push({ user_id: uid, full_name: profiles[uid] ?? null, score_date: date, total_points: pts });
        }
      }
      return rows.sort((a, b) => a.score_date.localeCompare(b.score_date));
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string): Promise<{ id: string; name: string }> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("join_group_by_code", {
        p_invite_code: inviteCode.trim(),
      });
      if (error) throw new Error(error.message ?? "Código inválido o grupo no encontrado");
      return data as { id: string; name: string };
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      // Notify group owner server-side (uses service_role to bypass RLS)
      fetch("/api/groups/member-joined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: data.id }),
      }).catch(() => {});
    },
  });
}
