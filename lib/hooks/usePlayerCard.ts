"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./useUser";
import { seasonTitle } from "./useSeasons";

export type PlayerTier = "none" | "champion" | "legend";

export interface PlayerWin {
  season_id: string;
  season_number: number;
  season_name: string;
  end_date: string;
  rank: number;           // 1, 2 o 3
  title: string;          // p. ej. "El más fuerte · Temp 1", "Subcampeón · Temp 1"
  is_legend_unlock: boolean; // true SOLO en la victoria que cruzó el umbral de 3 campeonatos
}

export interface PlayerCardData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  gender: string;
  joined_at: string | null;
  wins: PlayerWin[];
  wins_count: number;
  tier: PlayerTier;
  is_latest_champion: boolean;
  equipped: PlayerWin | null;
}

export function playerCardKey(userId: string, groupId: string) {
  return ["playerCard", userId, groupId] as const;
}

// Trae los datos de la tarjeta. Reutilizable para prefetch.
export async function fetchPlayerCard(userId: string, groupId: string): Promise<PlayerCardData | null> {
  {
      const supabase = createClient();

      type ProfileRow = { full_name: string | null; avatar_url: string | null; gender: string | null; equipped_season_id: string | null };
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, gender, equipped_season_id")
        .eq("id", userId)
        .single() as unknown as { data: ProfileRow | null };

      const gender = profile?.gender ?? "unspecified";

      type MemberRow = { joined_at: string | null };
      const { data: membership } = await supabase
        .from("group_members")
        .select("joined_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle() as unknown as { data: MemberRow | null };

      // Temporadas finalizadas del grupo
      type SeasonRow = { id: string; name: string; season_number: number; end_date: string };
      const { data: seasons } = await supabase
        .from("seasons")
        .select("id, name, season_number, end_date")
        .eq("group_id", groupId)
        .eq("status", "finished")
        .order("season_number", { ascending: false }) as unknown as { data: SeasonRow[] | null };

      const seasonList = seasons ?? [];
      const seasonIds = seasonList.map((s) => s.id);

      let wins: PlayerWin[] = [];
      if (seasonIds.length) {
        type StandingRow = { season_id: string; rank: number };
        const { data: standings } = await supabase
          .from("season_standings")
          .select("season_id, rank")
          .eq("user_id", userId)
          .lte("rank", 3)
          .in("season_id", seasonIds) as unknown as { data: StandingRow[] | null };

        const rankBySeason = new Map((standings ?? []).map((s) => [s.season_id, s.rank]));
        const rawWins = seasonList
          .filter((s) => rankBySeason.has(s.id))
          .map((s) => {
            const rank = rankBySeason.get(s.id)!;
            return {
              season_id: s.id,
              season_number: s.season_number,
              season_name: s.name,
              end_date: s.end_date,
              rank,
              title: `${seasonTitle(rank, gender)} · Temp ${s.season_number}`,
            };
          });

        // La victoria que cruzó el umbral legendario (3.ª victoria de campeonato)
        // season_number es la fuente de verdad del orden cronológico dentro del grupo
        const champAsc = rawWins
          .filter((w) => w.rank === 1)
          .sort((a, b) => a.season_number - b.season_number);
        const legendUnlockId = champAsc.length >= 3 ? champAsc[2].season_id : null;

        wins = rawWins.map((w) => ({ ...w, is_legend_unlock: w.season_id === legendUnlockId }));
      }

      // El nivel (oro/legendario) y el conteo de "títulos ganados" cuentan solo
      // los campeonatos (1°). Subcampeón/3° son títulos equipables, no campeonatos.
      const championships = wins.filter((w) => w.rank === 1).length;
      const tier: PlayerTier = championships >= 3 ? "legend" : championships >= 1 ? "champion" : "none";
      const winsCount = wins.length;

      // Último campeón: ganó la temporada finalizada más reciente del grupo
      const latestSeason = seasonList[0]; // ya ordenado desc
      const isLatestChampion = !!latestSeason && wins.some((w) => w.season_id === latestSeason.id && w.rank === 1);

      // Título equipado: el elegido si es de este grupo, si no el más reciente de este grupo
      const equipped =
        wins.find((w) => w.season_id === profile?.equipped_season_id) ?? wins[0] ?? null;

      return {
        user_id: userId,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null,
        gender,
        joined_at: membership?.joined_at ?? null,
        wins,
        wins_count: winsCount,
        tier,
        is_latest_champion: isLatestChampion,
        equipped,
      };
  }
}

// Datos de la tarjeta de un jugador, dentro del contexto de un grupo.
// `placeholder` (nombre/foto que ya conocemos del leaderboard) evita el "?"
// mientras carga; con prefetch, normalmente ya está en caché y abre al instante.
export function usePlayerCard(
  userId: string | null,
  groupId: string | null,
  placeholder?: { full_name: string | null; avatar_url: string | null }
) {
  return useQuery({
    queryKey: ["playerCard", userId, groupId],
    enabled: !!userId && !!groupId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchPlayerCard(userId!, groupId!),
    placeholderData: placeholder
      ? {
          user_id: userId ?? "",
          full_name: placeholder.full_name,
          avatar_url: placeholder.avatar_url,
          gender: "unspecified",
          joined_at: null,
          wins: [],
          wins_count: 0,
          tier: "none",
          is_latest_champion: false,
          equipped: null,
        }
      : undefined,
  });
}

// Precarga las tarjetas de varios jugadores (para abrir al instante).
export function usePrefetchPlayerCards(userIds: string[], groupId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!groupId || userIds.length === 0) return;
    for (const uid of userIds) {
      qc.prefetchQuery({
        queryKey: ["playerCard", uid, groupId],
        queryFn: () => fetchPlayerCard(uid, groupId),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [qc, groupId, userIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
}

// Todas las victorias del usuario actual (cualquier grupo) para el selector de perfil.
export interface MyTitle extends PlayerWin {
  group_id: string;
  group_name: string;
}

export function useMyTitles() {
  const { user } = useUser();
  return useQuery({
    queryKey: ["myTitles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<MyTitle[]> => {
      const supabase = createClient();

      type ProfileRow = { gender: string | null };
      const { data: profile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", user!.id)
        .single() as unknown as { data: ProfileRow | null };
      const gender = profile?.gender ?? "unspecified";

      type StandingRow = { season_id: string; rank: number };
      const { data: standings } = await supabase
        .from("season_standings")
        .select("season_id, rank")
        .eq("user_id", user!.id)
        .lte("rank", 3) as unknown as { data: StandingRow[] | null };

      const rankBySeason = new Map((standings ?? []).map((s) => [s.season_id, s.rank]));
      const ids = Array.from(rankBySeason.keys());
      if (!ids.length) return [];

      type SeasonRow = { id: string; name: string; season_number: number; end_date: string; group_id: string; status: string };
      const { data: seasons } = await supabase
        .from("seasons")
        .select("id, name, season_number, end_date, group_id, status")
        .in("id", ids)
        .eq("status", "finished") as unknown as { data: SeasonRow[] | null };

      const seasonList = seasons ?? [];
      const groupIds = Array.from(new Set(seasonList.map((s) => s.group_id)));
      type GroupRow = { id: string; name: string };
      const { data: groups } = groupIds.length
        ? await supabase.from("groups").select("id, name").in("id", groupIds) as unknown as { data: GroupRow[] | null }
        : { data: null };
      const groupNames = new Map((groups ?? []).map((g) => [g.id, g.name]));

      // Mostrar más recientes primero por season_number (fuente de verdad del orden)
      const sorted = seasonList.sort((a, b) => b.season_number - a.season_number);

      // La 3.ª victoria de campeonato desbloquea el nivel legendario
      // Usar season_number ascendente: es el orden cronológico definitivo
      const champAscGlobal = [...seasonList]
        .filter((s) => rankBySeason.get(s.id) === 1)
        .sort((a, b) => a.season_number - b.season_number);
      const legendUnlockId = champAscGlobal.length >= 3 ? champAscGlobal[2].id : null;

      return sorted.map((s) => {
        const rank = rankBySeason.get(s.id)!;
        return {
          season_id: s.id,
          season_number: s.season_number,
          season_name: s.name,
          end_date: s.end_date,
          rank,
          title: `${seasonTitle(rank, gender)} · Temp ${s.season_number}`,
          group_id: s.group_id,
          group_name: groupNames.get(s.group_id) ?? "Grupo",
          is_legend_unlock: s.id === legendUnlockId,
        };
      });
    },
  });
}

// Equipar (o quitar) un título
export function useEquipTitle() {
  const { user } = useUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (seasonId: string | null): Promise<void> => {
      if (!user) throw new Error("Sin sesión");
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ equipped_season_id: seasonId } as unknown as never)
        .eq("id", user.id) as unknown as { error: { message: string } | null };
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["playerCard"] });
      qc.invalidateQueries({ queryKey: ["myTitles"] });
    },
  });
}
