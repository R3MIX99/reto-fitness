"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "./useProfile";

export type Recurrence = "daily" | "weekly" | "monthly" | "once";

export interface Challenge {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  recurrence: Recurrence;
  weekday: number | null;
  day_of_month: number | null;
  challenge_date: string | null;
  at_time: string | null;
  points: number;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayLocalStr(): string {
  return localDateStr(new Date());
}

// ¿El reto ocurre en la fecha dada? (date local)
export function occursOn(c: Challenge, date: Date): boolean {
  switch (c.recurrence) {
    case "daily":   return true;
    case "weekly":  return c.weekday === date.getDay();
    case "monthly": return c.day_of_month === date.getDate();
    case "once":    return c.challenge_date === localDateStr(date);
  }
}

// Descripción legible de la programación
export function scheduleLabel(c: Challenge): string {
  const t = c.at_time ? ` · ${c.at_time}` : "";
  switch (c.recurrence) {
    case "daily":   return `Cada día${t}`;
    case "weekly":  return `Cada ${WEEKDAYS[c.weekday ?? 0]}${t}`;
    case "monthly": return `Día ${c.day_of_month} de cada mes${t}`;
    case "once":    return `${c.challenge_date}${t}`;
  }
}

// ── Queries ──────────────────────────────────────────────────────────

export function useGroupChallenges(groupId: string | null) {
  return useQuery({
    queryKey: ["challenges", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Challenge[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("group_challenges")
        .select("id, group_id, title, description, recurrence, weekday, day_of_month, challenge_date, at_time, points")
        .eq("group_id", groupId!)
        .eq("active", true)
        .order("created_at", { ascending: false }) as unknown as { data: Challenge[] | null };
      return data ?? [];
    },
  });
}

// Asistentes (user_ids) de una ocurrencia.
export function useAttendance(challengeId: string | null, date: string) {
  return useQuery({
    queryKey: ["attendance", challengeId, date],
    enabled: !!challengeId && !!date,
    queryFn: async (): Promise<string[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("challenge_attendance")
        .select("user_id")
        .eq("challenge_id", challengeId!)
        .eq("occurrence_date", date)
        .eq("attended", true) as unknown as { data: { user_id: string }[] | null };
      return (data ?? []).map((r) => r.user_id);
    },
  });
}

export interface Memory {
  challenge_id: string;
  occurrence_date: string;
  photo_path: string;
  title: string;
}

// Recuerdos (fotos) de los retos del grupo, más recientes primero.
export function useChallengeMemories(groupId: string | null) {
  return useQuery({
    queryKey: ["challengeMemories", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Memory[]> => {
      const supabase = createClient();
      const { data: challenges } = await supabase
        .from("group_challenges").select("id, title").eq("group_id", groupId!) as unknown as { data: { id: string; title: string }[] | null };
      const titleById = new Map((challenges ?? []).map((c) => [c.id, c.title]));
      const ids = (challenges ?? []).map((c) => c.id);
      if (!ids.length) return [];
      const { data } = await supabase
        .from("challenge_memories")
        .select("challenge_id, occurrence_date, photo_path")
        .in("challenge_id", ids)
        .order("occurrence_date", { ascending: false }) as unknown as { data: { challenge_id: string; occurrence_date: string; photo_path: string }[] | null };
      return (data ?? []).map((m) => ({ ...m, title: titleById.get(m.challenge_id) ?? "Reto" }));
    },
  });
}

// URL firmada de una foto del bucket de recuerdos.
export async function signedMemoryUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage.from("recuerdos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ── Mutations ────────────────────────────────────────────────────────

export function useCreateChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      groupId: string; title: string; description?: string; recurrence: Recurrence;
      weekday?: number | null; dayOfMonth?: number | null; challengeDate?: string | null;
      atTime?: string | null; points: number;
    }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("create_group_challenge", {
        p_group_id: input.groupId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_recurrence: input.recurrence,
        p_weekday: input.weekday ?? null,
        p_day_of_month: input.dayOfMonth ?? null,
        p_challenge_date: input.challengeDate ?? null,
        p_at_time: input.atTime ?? null,
        p_points: input.points,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["challenges", vars.groupId] }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId }: { challengeId: string; groupId: string }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("delete_group_challenge", { p_challenge_id: challengeId });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["challenges", vars.groupId] }),
  });
}

export function useSetAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, date, userIds }: { challengeId: string; date: string; userIds: string[] }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("set_challenge_attendance", {
        p_challenge_id: challengeId, p_date: date, p_user_ids: userIds,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance", vars.challengeId, vars.date] });
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      qc.invalidateQueries({ queryKey: ["seasonLeaderboard"] });
    },
  });
}

// Sube la foto grupal de recuerdo y la registra.
export function useSetMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, challengeId, date, file }: { groupId: string; challengeId: string; date: string; file: File }): Promise<void> => {
      const supabase = createClient();
      const compressed = await compressImage(file, 1280);
      const path = `${groupId}/${challengeId}/${date}.jpg`;
      const { error: upErr } = await supabase.storage.from("recuerdos").upload(path, compressed, { upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { error } = await (supabase.rpc as Function)("set_challenge_memory", {
        p_challenge_id: challengeId, p_date: date, p_path: path,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["challengeMemories", vars.groupId] }),
  });
}
