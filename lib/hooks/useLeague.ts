"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

// ── Types ──────────────────────────────────────────────────────────────────

export type LeagueStatus = "active" | "finished";
export type LeagueParticipantStatus = "pending" | "accepted" | "rejected";

export interface GroupLeague {
  id: string;
  name: string;
  created_by: string;
  owner_group_id: string;
  status: LeagueStatus;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

export interface LeagueParticipant {
  id: string;
  league_id: string;
  group_id: string;
  invited_by: string;
  status: LeagueParticipantStatus;
  joined_at: string | null;
  created_at: string;
  groups: { name: string; id: string };
}

export interface LeagueStanding {
  group_id: string;
  group_name: string;
  total_points: number;
  member_count: number;
  rank: number;
}

export interface LeagueWithParticipants extends GroupLeague {
  participants: LeagueParticipant[];
}

// ── Queries ────────────────────────────────────────────────────────────────

/** Ligas donde alguno de mis grupos participa (activas) */
export function useMyLeagues(groupId: string | undefined) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["myLeagues", groupId],
    enabled: !!user && !!groupId,
    queryFn: async (): Promise<LeagueWithParticipants[]> => {
      const supabase = createClient() as any;
      // Ligas donde este grupo es dueño
      const { data: owned, error: e1 } = await supabase
        .from("group_leagues")
        .select("*, participants:league_participants(*, groups(id, name))")
        .eq("owner_group_id", groupId!)
        .eq("status", "active");
      if (e1) throw e1;

      // Ligas donde este grupo fue invitado y aceptó
      const { data: invited, error: e2 } = await supabase
        .from("league_participants")
        .select("league_id, league:group_leagues(*, participants:league_participants(*, groups(id, name)))")
        .eq("group_id", groupId!)
        .eq("status", "accepted");
      if (e2) throw e2;

      const invitedLeagues = (invited ?? [])
        .map((r: any) => r.league)
        .filter(Boolean)
        .filter((l: GroupLeague) => l.status === "active");

      const all = [...(owned ?? []), ...invitedLeagues];
      // dedup por id
      const seen = new Set<string>();
      return all.filter((l) => {
        if (seen.has(l.id)) return false;
        seen.add(l.id);
        return true;
      }) as LeagueWithParticipants[];
    },
  });
}

export interface LeagueEntry {
  league: LeagueWithParticipants;
  myGroupId: string;
  isOwner: boolean;
}

/**
 * Todas las ligas (activas + terminadas) en TODOS los grupos del usuario.
 * Devuelve también qué grupo del usuario está en cada liga y si es dueño.
 */
export function useAllLeagues() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["allLeagues", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<{ active: LeagueEntry[]; finished: LeagueEntry[]; pending: any[] }> => {
      const supabase = createClient() as any;

      // Grupos del usuario (con owner_id)
      const { data: memberships, error: me } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, owner_id, invite_code)")
        .eq("user_id", user!.id);
      if (me) throw me;
      const groupIds: string[] = (memberships ?? []).map((m: any) => m.group_id);
      if (groupIds.length === 0) return { active: [], finished: [], pending: [] };

      const myGroups: Record<string, { name: string; owner_id: string }> = {};
      (memberships ?? []).forEach((m: any) => {
        if (m.groups) myGroups[m.group_id] = m.groups;
      });

      // Participaciones en ligas (como owner o como invitado aceptado)
      const { data: participations, error: pe } = await supabase
        .from("league_participants")
        .select("group_id, status, league:group_leagues(*, participants:league_participants(*, groups(id, name)))")
        .in("group_id", groupIds)
        .in("status", ["accepted"]);
      if (pe) throw pe;

      // También ligas donde mi grupo es owner_group_id
      const { data: owned, error: oe } = await supabase
        .from("group_leagues")
        .select("*, participants:league_participants(*, groups(id, name))")
        .in("owner_group_id", groupIds);
      if (oe) throw oe;

      // Invitaciones pendientes (como grupo invitado)
      const { data: pendingInvites, error: pie } = await supabase
        .from("league_participants")
        .select("*, league:group_leagues(id, name, start_date, end_date, owner_group_id, owner_group:groups!group_leagues_owner_group_id_fkey(name))")
        .in("group_id", groupIds)
        .eq("status", "pending");
      if (pie) throw pie;

      const seen = new Set<string>();
      const entries: LeagueEntry[] = [];

      // Combinar owned + participations
      const allLeagues: Array<{ league: LeagueWithParticipants; myGroupId: string }> = [];

      (owned ?? []).forEach((l: LeagueWithParticipants) => {
        allLeagues.push({ league: l, myGroupId: l.owner_group_id });
      });
      (participations ?? []).forEach((p: any) => {
        if (p.league) allLeagues.push({ league: p.league, myGroupId: p.group_id });
      });

      allLeagues.forEach(({ league, myGroupId }) => {
        if (seen.has(league.id)) return;
        seen.add(league.id);
        entries.push({
          league,
          myGroupId,
          isOwner: myGroups[myGroupId]?.owner_id === user!.id,
        });
      });

      return {
        active: entries.filter((e) => e.league.status === "active"),
        finished: entries.filter((e) => e.league.status === "finished"),
        pending: pendingInvites ?? [],
      };
    },
  });
}

/** Invitaciones pendientes para un grupo del que soy dueño */
export function usePendingLeagueInvites(groupId: string | undefined) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["pendingLeagueInvites", groupId],
    enabled: !!user && !!groupId,
    queryFn: async () => {
      const supabase = createClient() as any;
      const { data, error } = await supabase
        .from("league_participants")
        .select("*, league:group_leagues(id, name, start_date, end_date, owner_group_id, owner_group:groups!group_leagues_owner_group_id_fkey(name))")
        .eq("group_id", groupId!)
        .eq("status", "pending");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Standings en vivo de una liga */
export function useLeagueStandings(leagueId: string | undefined) {
  return useQuery({
    queryKey: ["leagueStandings", leagueId],
    enabled: !!leagueId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<LeagueStanding[]> => {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc("get_league_standings", {
        p_league_id: leagueId!,
      });
      if (error) throw error;
      return (data ?? []) as LeagueStanding[];
    },
  });
}

export interface GroupPreview {
  group_id: string;
  group_name: string;
  owner_name: string;
  member_count: number;
  owner_tier: string;
}

/** Preview de un grupo por código de invitación (para verificar antes de crear liga) */
export function useGroupPreview(code: string) {
  return useQuery({
    queryKey: ["groupPreview", code.toUpperCase()],
    enabled: code.trim().length >= 4,
    staleTime: 30_000,
    retry: false,
    queryFn: async (): Promise<GroupPreview | null> => {
      const supabase = createClient() as any;
      const { data, error } = await supabase.rpc("get_group_preview", {
        p_invite_code: code.toUpperCase(),
      });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0] as GroupPreview;
    },
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Crear una liga e invitar a otro grupo (por group_id ya resuelto desde la preview) */
export function useCreateLeague() {
  const qc = useQueryClient();
  const { user } = useUser();
  return useMutation({
    mutationFn: async ({
      name,
      ownerGroupId,
      targetGroupId,
      startDate,
    }: {
      name: string;
      ownerGroupId: string;
      targetGroupId: string;
      startDate: string;
    }) => {
      const supabase = createClient() as any;

      if (targetGroupId === ownerGroupId)
        throw new Error("No puedes invitar a tu propio grupo");

      // Crear la liga
      const { data: league, error: le } = await supabase
        .from("group_leagues")
        .insert({
          name,
          created_by: user!.id,
          owner_group_id: ownerGroupId,
          start_date: startDate,
        })
        .select()
        .single();
      if (le) throw le;

      // Insertar grupo creador como aceptado
      const { error: p1 } = await supabase.from("league_participants").insert({
        league_id: league.id,
        group_id: ownerGroupId,
        invited_by: user!.id,
        status: "accepted",
        joined_at: new Date().toISOString(),
      });
      if (p1) throw p1;

      // Invitar al otro grupo
      const { error: p2 } = await supabase.from("league_participants").insert({
        league_id: league.id,
        group_id: targetGroupId,
        invited_by: user!.id,
        status: "pending",
      });
      if (p2) throw p2;

      return { league };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["myLeagues", vars.ownerGroupId] });
      qc.invalidateQueries({ queryKey: ["allLeagues"] });
    },
  });
}

/** Aceptar o rechazar una invitación de liga */
export function useRespondLeagueInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leagueId,
      groupId,
      accept,
    }: {
      leagueId: string;
      groupId: string;
      accept: boolean;
    }) => {
      const supabase = createClient() as any;
      const { error } = await supabase.rpc("respond_league_invite", {
        p_league_id: leagueId,
        p_group_id: groupId,
        p_accept: accept,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pendingLeagueInvites", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["myLeagues", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["allLeagues"] });
    },
  });
}

/** Crear liga entre dos grupos propios (ambos se insertan como accepted de inmediato) */
export function useCreateLeagueBetweenMyGroups() {
  const qc = useQueryClient();
  const { user } = useUser();
  return useMutation({
    mutationFn: async ({
      name,
      groupA,
      groupB,
      startDate,
    }: {
      name: string;
      groupA: string;
      groupB: string;
      startDate: string;
    }) => {
      const supabase = createClient() as any;
      const { data: league, error: le } = await supabase
        .from("group_leagues")
        .insert({
          name,
          created_by: user!.id,
          owner_group_id: groupA,
          start_date: startDate,
        })
        .select()
        .single();
      if (le) throw le;

      const { error: pe } = await supabase.from("league_participants").insert([
        { league_id: league.id, group_id: groupA, invited_by: user!.id, status: "accepted", joined_at: new Date().toISOString() },
        { league_id: league.id, group_id: groupB, invited_by: user!.id, status: "accepted", joined_at: new Date().toISOString() },
      ]);
      if (pe) throw pe;
      return league;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allLeagues"] });
    },
  });
}
