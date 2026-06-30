"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export type Tier = "free" | "pro" | "elite";

export const TIER_LABEL: Record<Tier, string> = { free: "Free", pro: "Pro", elite: "Elite" };
export const TIER_PRICE: Record<Tier, string> = { free: "$0", pro: "$99 MXN/mes", elite: "$199 MXN/mes" };

export interface MyPlan {
  tier: Tier;
  is_super_admin: boolean;
  max_groups: number;
  max_members: number;
  owned_groups: number;
  over_limit_until: string | null;
  celebrate: Tier | null;
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

// Realtime de la suscripción propia: refresca el plan al instante cuando el
// super-admin (o Stripe en Fase 4) cambia el tier.
export function useSubscriptionRealtime() {
  const { user } = useUser();
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`sub-rt-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ["myPlan"] });
          qc.invalidateQueries({ queryKey: ["groups"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);
}

// Limpia la marca de celebración tras mostrarla.
export function useClearCelebration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const supabase = createClient();
      await (supabase.rpc as Function)("clear_celebration");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myPlan"] }),
  });
}

// ── Stripe: checkout y portal ────────────────────────────────────────

// Inicia el checkout de Stripe y redirige. seats = miembros extra (opcional).
export function useStartCheckout() {
  return useMutation({
    mutationFn: async (args: { tier: "pro" | "elite"; interval: "month" | "year"; seats?: number }) => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo iniciar el pago");
      window.location.href = data.url as string;
    },
  });
}

// Abre el Customer Portal de Stripe (gestionar/cancelar suscripción).
export function useOpenPortal() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "No se pudo abrir el portal");
      window.location.href = data.url as string;
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
      // Push al usuario sobre el cambio de plan (best-effort; el in-app lo hace el RPC)
      fetch("/api/plan/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier }),
      }).catch(() => {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["adminSearch"] }),
  });
}
