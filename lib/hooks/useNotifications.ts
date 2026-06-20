"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
}

export function useNotifications() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Notification[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read, created_at, metadata")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50) as unknown as { data: Notification[] | null };
      return data ?? [];
    },
  });
}

export function useMarkAllRead() {
  const { user } = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true } as never)
        .eq("user_id", user!.id)
        .eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      await supabase
        .from("notifications")
        .update({ read: true } as never)
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
