"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import type { CheckEvidence } from "./useChecklist";

// Recuerdos preservados para el Wrapped anual (Pro/Elite). El usuario guarda sus
// evidencias favoritas; quedan exentas de la purga de storage.

export const MEMORY_MANUAL_CAP = 20; // por usuario por año

export interface Memory {
  id: string;
  check_id: string | null;
  kind: string | null;
  goal_title: string | null;
  check_date: string;
  year: number;
  path: string;
  evidence: CheckEvidence | null;
  source: "manual" | "auto";
}

// Lista completa de recuerdos del usuario (para la página de recuerdos).
export function useMemoriesList() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["memoriesList", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Memory[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("memories")
        .select("id, check_id, kind, goal_title, check_date, year, path, evidence, source")
        .eq("user_id", user!.id)
        .order("check_date", { ascending: false }) as unknown as { data: Memory[] | null };
      return data ?? [];
    },
  });
}

// Set de check_id que el usuario ya guardó como recuerdo (para el toggle).
export function useMemoryCheckIds() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["memoryCheckIds", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("memories")
        .select("check_id")
        .eq("user_id", user!.id) as unknown as { data: { check_id: string | null }[] | null };
      return new Set((data ?? []).map((r) => r.check_id).filter(Boolean) as string[]);
    },
  });
}

// Cuántos recuerdos manuales lleva el usuario en un año (para mostrar el tope).
export function useMemoryCount(year: number) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["memoryCount", user?.id, year],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const supabase = createClient();
      const { count } = await supabase
        .from("memories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("year", year)
        .eq("source", "manual") as unknown as { count: number | null };
      return count ?? 0;
    },
  });
}

export function useSaveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkId: string) => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("save_memory", { p_check_id: checkId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memoryCheckIds"] });
      qc.invalidateQueries({ queryKey: ["memoryCount"] });
      qc.invalidateQueries({ queryKey: ["memoriesList"] });
    },
  });
}

export function useRemoveMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (checkId: string) => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("remove_memory", { p_check_id: checkId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memoryCheckIds"] });
      qc.invalidateQueries({ queryKey: ["memoryCount"] });
      qc.invalidateQueries({ queryKey: ["memoriesList"] });
    },
  });
}
