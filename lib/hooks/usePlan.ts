"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export type Tier = "free" | "pro" | "elite";

export const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", elite: "Elite" };
export const TIER_PRICE: Record<Tier, string> = { free: "$0", pro: "$5.99/mes", elite: "$12.99/mes" };

export interface MyPlan {
  tier: Tier;
  is_super_admin: boolean;
  max_groups: number;
  max_members: number;
  owned_groups: number;
}

// Plan del usuario actual + uso de grupos (vía RPC get_my_plan).
export function usePlan() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["myPlan", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<MyPlan | null> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("get_my_plan");
      if (error) throw new Error(error.message);
      return data as MyPlan;
    },
  });
}

// ── Super-admin ──────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  tier: Tier;
  is_super_admin: boolean;
}

export function useAdminSearchUsers(query: string, enabled: boolean) {
  return useQuery({
    queryKey: ["adminSearch", query],
    enabled,
    queryFn: async (): Promise<AdminUser[]> => {
      const supabase = createClient();
      const { data, error } = await (supabase.rpc as Function)("admin_search_users", { p_query: query });
      if (error) throw new Error(error.message);
      return (data ?? []) as AdminUser[];
    },
  });
}

export function useSetUserTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: Tier }): Promise<void> => {
      const supabase = createClient();
      const { error } = await (supabase.rpc as Function)("set_user_tier", { p_user: userId, p_tier: tier });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSearch"] }),
  });
}
