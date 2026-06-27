"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import type { TitleStyleId } from "@/components/player/TitleBadge";

export interface SeasonCustomTitle {
  season_id: string;
  title_text: string;
  title_style: TitleStyleId;
}

export function useSeasonCustomTitle(seasonId: string | null | undefined) {
  return useQuery({
    queryKey: ["seasonCustomTitle", seasonId],
    enabled: !!seasonId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SeasonCustomTitle | null> => {
      if (!seasonId) return null;
      const supabase = createClient();
      const { data } = await supabase
        .from("season_custom_titles")
        .select("season_id, title_text, title_style")
        .eq("season_id", seasonId)
        .maybeSingle() as unknown as { data: SeasonCustomTitle | null };
      return data ?? null;
    },
  });
}

export function useSetSeasonCustomTitle() {
  const { user } = useUser();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seasonId,
      titleText,
      titleStyle,
    }: {
      seasonId: string;
      titleText: string;
      titleStyle: TitleStyleId;
    }): Promise<void> => {
      if (!user) throw new Error("Sin sesión");
      const supabase = createClient();
      const { error } = await (
        supabase.from("season_custom_titles") as unknown as {
          upsert: (
            row: object,
            opts: object
          ) => Promise<{ error: { message: string } | null }>;
        }
      ).upsert(
        {
          season_id: seasonId,
          title_text: titleText,
          title_style: titleStyle,
          created_by: user.id,
        },
        { onConflict: "season_id" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["seasonCustomTitle", vars.seasonId] });
      qc.invalidateQueries({ queryKey: ["playerCard"] });
      qc.invalidateQueries({ queryKey: ["myTitles"] });
    },
  });
}
