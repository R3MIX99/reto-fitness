"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

// ── Types ──────────────────────────────────────────────────────────────────

export type SeasonStatus = "active" | "reviewing" | "finished" | "cancelled";

export interface Season {
  id: string;
  group_id: string;
  name: string;
  season_number: number;
  status: SeasonStatus;
  start_date: string;       // YYYY-MM-DD
  end_date: string;         // YYYY-MM-DD
  duration_weeks: number;
  grace_days: number;
  created_by: string;
  cancel_reason: string | null;
  cancelled_at: string | null;
  finished_at: string | null;
  created_at: string | null;
}

// Duración: el dueño elige en "meses" pero internamente son semanas (múltiplos de 7)
export const DURATION_OPTIONS = [
  { label: "1 mes", weeks: 4 },
  { label: "2 meses", weeks: 8 },
  { label: "3 meses", weeks: 12 },
  { label: "4 meses", weeks: 16 },
  { label: "5 meses", weeks: 20 },
] as const;

// ── Helpers de fecha (local, sin drift de zona horaria) ──────────────────────

function parseDate(d: string): Date {
  return new Date(d + "T12:00:00");
}

function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12, 0, 0);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Cálculo de fase ──────────────────────────────────────────────────────────

export interface PhaseInfo {
  totalPhases: number;
  currentPhase: number;      // 1-indexed, clamped a [1, totalPhases]
  phaseStart: Date;
  phaseEnd: Date;
  hasStarted: boolean;       // hoy >= start_date
  daysUntilStart: number;    // 0 si ya empezó
  daysLeftInSeason: number;  // hasta end_date inclusive (0 si terminó)
  daysLeftInPhase: number;   // hasta phaseEnd inclusive
}

export function computePhase(season: Season): PhaseInfo {
  const start = parseDate(season.start_date);
  const end = parseDate(season.end_date);
  const today = todayLocal();
  const totalPhases = season.duration_weeks; // cada fase = 1 semana

  const elapsed = daysBetween(start, today);
  const hasStarted = elapsed >= 0;

  let currentPhase = Math.floor(elapsed / 7) + 1;
  if (currentPhase < 1) currentPhase = 1;
  if (currentPhase > totalPhases) currentPhase = totalPhases;

  const phaseStartOffset = (currentPhase - 1) * 7;
  const phaseStart = parseDate(season.start_date);
  phaseStart.setDate(phaseStart.getDate() + phaseStartOffset);
  const phaseEnd = parseDate(season.start_date);
  phaseEnd.setDate(phaseEnd.getDate() + phaseStartOffset + 6);

  return {
    totalPhases,
    currentPhase,
    phaseStart,
    phaseEnd,
    hasStarted,
    daysUntilStart: hasStarted ? 0 : daysBetween(today, start),
    daysLeftInSeason: Math.max(0, daysBetween(today, end)),
    daysLeftInPhase: Math.max(0, daysBetween(today, phaseEnd)),
  };
}

// ── Ventana de auditoría por fase ────────────────────────────────────────────
// Devuelve el rango de fechas [from, to] de checks que TODAVÍA se pueden auditar:
// la fase actual + (durante sus primeros `grace_days` días) la fase anterior.
// null si no hay temporada o aún no empieza.
export function auditableWindow(season: Season | null): { from: string; to: string } | null {
  if (!season) return null;
  const phase = computePhase(season);
  if (!phase.hasStarted) return null;

  const start = parseDate(season.start_date);
  const end = parseDate(season.end_date);
  const today = todayLocal();

  const currentPhaseStart = parseDate(season.start_date);
  currentPhaseStart.setDate(currentPhaseStart.getDate() + (phase.currentPhase - 1) * 7);
  const daysIntoPhase = daysBetween(currentPhaseStart, today); // >= 0

  let from = currentPhaseStart;
  // Durante los primeros `grace_days` días de la fase, la fase anterior sigue auditable
  if (phase.currentPhase >= 2 && daysIntoPhase <= season.grace_days - 1) {
    const prevPhaseStart = parseDate(season.start_date);
    prevPhaseStart.setDate(prevPhaseStart.getDate() + (phase.currentPhase - 2) * 7);
    from = prevPhaseStart;
  }
  if (from < start) from = start;

  const to = today < end ? today : end;
  return { from: localDateStr(from), to: localDateStr(to) };
}

// Mapa group_id → ventana auditable.
// - Grupo con temporada YA INICIADA (active+empezada, o reviewing): ventana por
//   fase (fase actual + fase anterior en gracia).
// - Grupo SIN temporada iniciada (sin temporada, o con una programada que aún
//   no arranca): ventana GLOBAL (todos los pendientes), para poder revisarlos
//   igual. Al iniciar la temporada vuelve a aplicar la ventana por fase.
export async function fetchAuditableWindows(
  groupIds: string[]
): Promise<Record<string, { from: string; to: string }>> {
  if (!groupIds.length) return {};
  const supabase = createClient();
  const { data } = await supabase
    .from("seasons")
    .select("*")
    .in("group_id", groupIds)
    .in("status", ["active", "reviewing"]) as unknown as { data: Season[] | null };

  const out: Record<string, { from: string; to: string }> = {};
  const covered = new Set<string>();
  for (const s of data ?? []) {
    const w = auditableWindow(s); // null si la temporada aún no empieza
    if (w) {
      out[s.group_id] = w;
      covered.add(s.group_id);
    }
  }

  // Grupos sin temporada iniciada → ventana global (revisar todos los pendientes)
  const today = localDateStr(todayLocal());
  for (const gid of groupIds) {
    if (!covered.has(gid)) {
      out[gid] = { from: "1970-01-01", to: today };
    }
  }

  return out;
}

// ── Queries ────────────────────────────────────────────────────────────────

// Temporada en curso (active o reviewing) del grupo, o null si no hay.
export function useActiveSeason(groupId: string | null) {
  return useQuery({
    queryKey: ["activeSeason", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Season | null> => {
      if (!groupId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("group_id", groupId)
        .in("status", ["active", "reviewing"])
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as Season | null) ?? null;
    },
  });
}

// Cuenta cuántas temporadas activas (ya iniciadas) tiene el usuario entre sus grupos.
export function useActiveSeasonCount(groupIds: string[]) {
  return useQuery({
    queryKey: ["activeSeasonCount", groupIds],
    enabled: groupIds.length > 0,
    queryFn: async (): Promise<number> => {
      if (!groupIds.length) return 0;
      const supabase = createClient();
      type Row = { start_date: string };
      const { data } = await supabase
        .from("seasons")
        .select("start_date")
        .in("group_id", groupIds)
        .in("status", ["active", "reviewing"]) as unknown as { data: Row[] | null };
      const today = new Date().toISOString().split("T")[0];
      return (data ?? []).filter((s) => s.start_date <= today).length;
    },
    staleTime: 60_000,
  });
}

export interface SeasonLeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  position: number;
  is_leader: boolean;
  streak_day: number;
}

// Leaderboard de la temporada: SOLO miembros inscritos (season_members) y
// SOLO puntos cuya score_date cae dentro del rango de la temporada.
// Incluye a todos los miembros aunque tengan 0 puntos.
export function useSeasonLeaderboard(season: Season | null) {
  return useQuery({
    queryKey: ["seasonLeaderboard", season?.id],
    enabled: !!season,
    queryFn: async (): Promise<SeasonLeaderboardEntry[]> => {
      if (!season) return [];
      const supabase = createClient();

      type MemberRow = { user_id: string };
      type ScoreRow = { user_id: string; total_points: number | null; streak_bonus: number | null; streak_day: number | null; score_date: string };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };

      const _ssd = new Date();
      const todaySsd = `${_ssd.getFullYear()}-${String(_ssd.getMonth()+1).padStart(2,"0")}-${String(_ssd.getDate()).padStart(2,"0")}`;

      const { data: members } = await supabase
        .from("season_members")
        .select("user_id")
        .eq("season_id", season.id) as unknown as { data: MemberRow[] | null };

      const memberIds = (members ?? []).map((m) => m.user_id);
      if (!memberIds.length) return [];

      const { data: scores } = await supabase
        .from("daily_scores")
        .select("user_id, total_points, streak_bonus, streak_day, score_date")
        .eq("group_id", season.group_id)
        .gte("score_date", season.start_date)
        .lte("score_date", season.end_date)
        .in("user_id", memberIds) as unknown as { data: ScoreRow[] | null };

      const totals: Record<string, number> = {};
      const streakDaysSs: Record<string, number> = {};
      for (const id of memberIds) totals[id] = 0;
      for (const r of scores ?? []) {
        totals[r.user_id] = (totals[r.user_id] ?? 0) + (r.total_points ?? 0) + (r.streak_bonus ?? 0);
        if (r.score_date === todaySsd) streakDaysSs[r.user_id] = r.streak_day ?? 0;
      }

      const profiles = await Promise.all(
        memberIds.map(async (uid) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", uid)
            .single() as unknown as { data: ProfileRow | null };
          return {
            user_id: uid,
            full_name: p?.full_name ?? null,
            avatar_url: p?.avatar_url ?? null,
          };
        })
      );

      return profiles
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0, streak_day: streakDaysSs[p.user_id] ?? 0 }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((p, i) => ({ ...p, position: i + 1, is_leader: i === 0 }));
    },
  });
}

// Todas las temporadas del grupo (cualquier estado), más recientes primero.
export function useSeasonHistory(groupId: string | null) {
  return useQuery({
    queryKey: ["seasonHistory", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Season[]> => {
      if (!groupId) return [];
      const supabase = createClient();
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .eq("group_id", groupId)
        .order("season_number", { ascending: false }) as unknown as { data: Season[] | null };
      return data ?? [];
    },
  });
}

// Tabla final (podio) de una temporada concreta. Vacío si no tiene snapshot.
export function useSeasonStandings(seasonId: string | null) {
  return useQuery({
    queryKey: ["seasonStandings", seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<PodiumEntry[]> => {
      if (!seasonId) return [];
      const supabase = createClient();

      type StandingRow = { user_id: string; rank: number; total_points: number };
      const { data: rows } = await supabase
        .from("season_standings")
        .select("user_id, rank, total_points")
        .eq("season_id", seasonId)
        .order("rank", { ascending: true }) as unknown as { data: StandingRow[] | null };

      type ProfileRow = { full_name: string | null; avatar_url: string | null; gender: string | null };
      return Promise.all(
        (rows ?? []).map(async (r) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, gender")
            .eq("id", r.user_id)
            .single() as unknown as { data: ProfileRow | null };
          return {
            user_id: r.user_id,
            full_name: p?.full_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            gender: p?.gender ?? "unspecified",
            rank: r.rank,
            total_points: r.total_points,
          };
        })
      );
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useStartSeason() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      durationWeeks,
      startDate,
      name,
    }: {
      groupId: string;
      durationWeeks: number;
      startDate: string;
      name?: string;
    }): Promise<string> => {
      if (!user) throw new Error("No autenticado");
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("start_season", {
        p_group_id: groupId,
        p_duration_weeks: durationWeeks,
        p_start_date: startDate,
        p_name: name ?? null,
      });
      if (error) throw new Error(error.message);
      const seasonId = data as string;
      // Push a los miembros (best-effort); el in-app lo hace el RPC
      fetch("/api/seasons/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, event: "start" }),
      }).catch(() => {});
      return seasonId;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["activeSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["seasonHistory", vars.groupId] });
    },
  });
}

// Editar una temporada programada (aún no empieza)
export function useUpdateScheduledSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seasonId,
      groupId,
      durationWeeks,
      startDate,
      name,
    }: {
      seasonId: string;
      groupId: string;
      durationWeeks: number;
      startDate: string;
      name?: string;
    }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("update_scheduled_season", {
        p_season_id: seasonId,
        p_duration_weeks: durationWeeks,
        p_start_date: startDate,
        p_name: name ?? null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["activeSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["seasonLeaderboard"] });
    },
  });
}

// Cancelar (eliminar) una temporada programada que aún no empieza
export function useDeleteScheduledSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seasonId }: { seasonId: string; groupId: string }): Promise<void> => {
      const supabase = createClient();
      // Push ANTES de borrar (después la temporada y sus miembros ya no existen)
      await fetch("/api/seasons/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, event: "scheduled_cancelled" }),
      }).catch(() => {});
      const { error } = await (supabase.rpc as Function)("delete_scheduled_season", {
        p_season_id: seasonId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["activeSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["seasonHistory", vars.groupId] });
    },
  });
}

// Terminar una temporada en curso anticipadamente (sin títulos).
// Pide razón → cambia estado + notifica in-app (RPC) y envía push (API route).
export function useCancelSeason() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seasonId,
      reason,
    }: {
      seasonId: string;
      groupId: string;
      reason: string;
    }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("cancel_season", {
        p_season_id: seasonId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
      // Push (best-effort); el in-app lo hace el RPC
      fetch("/api/seasons/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, event: "cancelled" }),
      }).catch(() => {});
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["activeSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["seasonLeaderboard"] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["finishedSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["seasonHistory", vars.groupId] });
    },
  });
}

// ── Temporada finalizada (para el podio) ──────────────────────────────────────

export interface PodiumEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: string;
  rank: number;
  total_points: number;
}

export interface FinishedSeasonResult {
  season: Season;
  standings: PodiumEntry[];
}

// Título del podio según posición y género
export function seasonTitle(rank: number, gender: string): string {
  if (rank === 1) return gender === "female" ? "La más fuerte" : "El más fuerte";
  if (rank === 2) return gender === "female" ? "Subcampeona" : "Subcampeón";
  if (rank === 3) return "Tercer lugar";
  return "";
}

// Última temporada FINALIZADA del grupo (status 'finished') con su podio.
// Las canceladas no cuentan (no entregan títulos).
export function useLatestFinishedSeason(groupId: string | null) {
  return useQuery({
    queryKey: ["finishedSeason", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<FinishedSeasonResult | null> => {
      if (!groupId) return null;
      const supabase = createClient();

      const { data: season } = await supabase
        .from("seasons")
        .select("*")
        .eq("group_id", groupId)
        .eq("status", "finished")
        .order("season_number", { ascending: false })
        .limit(1)
        .maybeSingle() as unknown as { data: Season | null };

      if (!season) return null;

      type StandingRow = { user_id: string; rank: number; total_points: number };
      const { data: rows } = await supabase
        .from("season_standings")
        .select("user_id, rank, total_points")
        .eq("season_id", season.id)
        .order("rank", { ascending: true }) as unknown as { data: StandingRow[] | null };

      type ProfileRow = { full_name: string | null; avatar_url: string | null; gender: string | null };
      const standings: PodiumEntry[] = await Promise.all(
        (rows ?? []).map(async (r) => {
          const { data: p } = await supabase
            .from("profiles")
            .select("full_name, avatar_url, gender")
            .eq("id", r.user_id)
            .single() as unknown as { data: ProfileRow | null };
          return {
            user_id: r.user_id,
            full_name: p?.full_name ?? null,
            avatar_url: p?.avatar_url ?? null,
            gender: p?.gender ?? "unspecified",
            rank: r.rank,
            total_points: r.total_points,
          };
        })
      );

      return { season, standings };
    },
  });
}
