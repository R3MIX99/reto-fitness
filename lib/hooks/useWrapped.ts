"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export interface WrappedData {
  year: number;
  active_days: number;
  total_checks: number;
  gym_checks: number;
  diet_checks: number;
  goal_checks: number;
  longest_streak: number;
  total_points: number;
  best_month: number | null;
  best_month_days: number | null;
  titles: number;
  groups: number;
  memories: number;
}

export function useWrapped(year: number) {
  const { user } = useUser();
  return useQuery({
    queryKey: ["wrapped", user?.id, year],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<WrappedData | null> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("get_wrapped", { p_year: year });
      if (error) throw new Error(error.message);
      return data as WrappedData;
    },
  });
}
