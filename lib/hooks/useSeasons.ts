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

export interface SeasonLeaderboardEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  position: number;
  is_leader: boolean;
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
      type ScoreRow = { user_id: string; total_points: number | null };
      type ProfileRow = { full_name: string | null; avatar_url: string | null };

      const { data: members } = await supabase
        .from("season_members")
        .select("user_id")
        .eq("season_id", season.id) as unknown as { data: MemberRow[] | null };

      const memberIds = (members ?? []).map((m) => m.user_id);
      if (!memberIds.length) return [];

      const { data: scores } = await supabase
        .from("daily_scores")
        .select("user_id, total_points")
        .eq("group_id", season.group_id)
        .gte("score_date", season.start_date)
        .lte("score_date", season.end_date)
        .in("user_id", memberIds) as unknown as { data: ScoreRow[] | null };

      const totals: Record<string, number> = {};
      for (const id of memberIds) totals[id] = 0;
      for (const r of scores ?? []) {
        totals[r.user_id] = (totals[r.user_id] ?? 0) + (r.total_points ?? 0);
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
        .map((p) => ({ ...p, total_points: totals[p.user_id] ?? 0 }))
        .sort((a, b) => b.total_points - a.total_points)
        .map((p, i) => ({ ...p, position: i + 1, is_leader: i === 0 }));
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
      return data as string;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["activeSeason", vars.groupId] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });
}
