"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { useSeasonLeaderboard, computePhase, type Season, type SeasonLeaderboardEntry } from "@/lib/hooks/useSeasons";
import { useUser } from "@/lib/hooks/useUser";
import { PlayerCard } from "@/components/player/PlayerCard";
import { usePrefetchPlayerCards } from "@/lib/hooks/usePlayerCard";

// ── Fetch todas las temporadas activas de múltiples grupos en una sola query ─

function useActiveSeasonsByGroups(groupIds: string[]) {
  return useQuery({
    queryKey: ["activeSeasonsByGroups", groupIds],
    enabled: groupIds.length > 0,
    queryFn: async (): Promise<Record<string, Season>> => {
      if (!groupIds.length) return {};
      const supabase = createClient();
      type SeasonRow = Season & { group_id: string };
      const { data } = await supabase
        .from("seasons")
        .select("*")
        .in("group_id", groupIds)
        .in("status", ["active", "reviewing"])
        .order("season_number", { ascending: false }) as unknown as { data: SeasonRow[] | null };

      // Una por grupo: la más reciente
      const map: Record<string, Season> = {};
      for (const s of data ?? []) {
        if (!map[s.group_id]) map[s.group_id] = s;
      }
      return map;
    },
    staleTime: 60_000,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function seasonProgress(season: Season): { elapsed: number; total: number; pct: number } {
  const start = new Date(season.start_date + "T00:00:00").getTime();
  const end   = new Date(season.end_date   + "T23:59:59").getTime();
  const now   = Date.now();
  const total   = Math.max(1, Math.round((end - start) / 86400000));
  const elapsed = Math.min(total, Math.max(0, Math.round((now - start) / 86400000)));
  return { elapsed, total, pct: Math.round((elapsed / total) * 100) };
}

function buildInsight(
  myEntry: SeasonLeaderboardEntry | undefined,
  lb: SeasonLeaderboardEntry[],
): string {
  if (!myEntry) return "";
  const above = lb.find((e) => e.position === myEntry.position - 1);
  const below = lb.find((e) => e.position === myEntry.position + 1);

  if (myEntry.position === 1) {
    if (below) {
      const gap = myEntry.total_points - below.total_points;
      return `Le llevas ${gap} pt${gap !== 1 ? "s" : ""} al segundo. Mantén el ritmo para no perder el liderato.`;
    }
    return "Eres el líder de la temporada. ¡Sigue así!";
  }
  const parts: string[] = [];
  if (above) {
    const gapUp = above.total_points - myEntry.total_points;
    parts.push(`A ${above.full_name?.split(" ")[0] ?? "él"} le llevas −${gapUp} pt${gapUp !== 1 ? "s" : ""}`);
  }
  if (below) {
    const gapDown = myEntry.total_points - below.total_points;
    parts.push(`le llevas +${gapDown} al ${myEntry.position + 1}°`);
  }
  return parts.join(" · ") + ". Un día completo puede cambiar todo.";
}

// ── Avatar ────────────────────────────────────────────────────────────────

function Avatar({ url, initials, size = 28 }: { url?: string | null; initials: string; size?: number }) {
  if (url) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
        <Image src={url} alt={initials} width={size} height={size} className="object-cover w-full h-full" unoptimized={url.includes("?t=")} referrerPolicy="no-referrer" />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
      style={{ width: size, height: size, background: "var(--color-surface)", color: "var(--color-fg)", fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

// ── SeasonCard (recibe la season ya resuelta, sin fetch doble) ────────────

function SeasonCard({
  season,
  groupName,
  groupId,
  userId,
}: {
  season: Season;
  groupName: string;
  groupId: string;
  userId: string;
}) {
  const { data: lb = [] } = useSeasonLeaderboard(season);
  const [cardUserId, setCardUserId] = useState<string | null>(null);

  // Precarga tarjetas para que abran al instante
  usePrefetchPlayerCards(lb.map((e) => e.user_id), groupId);

  const { elapsed, total, pct } = seasonProgress(season);
  // FIX: puntos posibles = duración total de la temporada × 13 (no solo días transcurridos)
  const totalPossible = total * 13;

  const myEntry = lb.find((e) => e.user_id === userId);
  const myPos   = myEntry?.position ?? null;
  const myPts   = myEntry?.total_points ?? 0;

  const rivals: SeasonLeaderboardEntry[] = [];
  if (myPos === 1) {
    const r1 = lb.find((e) => e.position === 2);
    const r2 = lb.find((e) => e.position === 3);
    if (r1) rivals.push(r1);
    if (r2) rivals.push(r2);
  } else {
    const above = lb.find((e) => e.position === (myPos ?? 0) - 1);
    const below = lb.find((e) => e.position === (myPos ?? 0) + 1);
    if (above) rivals.push(above);
    if (below) rivals.push(below);
  }

  const insight = buildInsight(myEntry, lb);

  const rows: (SeasonLeaderboardEntry | "me")[] = [];
  if (myPos === 1) {
    rows.push("me");
    rivals.forEach((r) => rows.push(r));
  } else {
    const above = rivals.find((r) => r.position === (myPos ?? 0) - 1);
    const below = rivals.find((r) => r.position === (myPos ?? 0) + 1);
    if (above) rows.push(above);
    rows.push("me");
    if (below) rows.push(below);
  }

  return (
    <div
      className="rounded-[18px] p-4"
      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div
            className="font-display font-semibold"
            style={{ fontSize: 44, lineHeight: 1, color: "var(--color-warm)" }}
          >
            {myPos !== null ? `#${myPos}` : "—"}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            de {lb.length} jugador{lb.length !== 1 ? "es" : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-medium" style={{ color: "var(--color-fg)" }}>
            {season.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            {groupName}
          </div>
        </div>
      </div>

      {/* Puntos: lo que llevas vs. el total de toda la temporada */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display font-semibold text-[22px]" style={{ color: "var(--color-fg)" }}>
          {myPts}
        </span>
        <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
          / {totalPossible} pts de la temporada
        </span>
        <span className="text-[11px] ml-auto" style={{ color: "var(--color-muted)" }}>
          Día {elapsed} de {total}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="h-[5px] rounded-full overflow-hidden mb-1" style={{ background: "var(--color-surface)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "var(--color-warm)" }}
        />
      </div>
      <div className="flex justify-between text-[10px] mb-3.5" style={{ color: "#555" }}>
        <span>Inicio</span>
        <span>{pct}% de la temporada</span>
        <span>Fin</span>
      </div>

      <div className="h-px mb-3" style={{ background: "var(--color-border)" }} />

      <div className="text-[11px] mb-2.5" style={{ color: "#555" }}>
        Posiciones cercanas
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const isMe  = row === "me";
          const entry = isMe ? myEntry : (row as SeasonLeaderboardEntry);
          if (!entry) return null;
          const diff = entry.total_points - myPts;
          const initials = (entry.full_name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
          return (
            <div
              key={isMe ? "me" : entry.user_id}
              className="flex items-center gap-2.5 rounded-[12px] px-3 py-2"
              style={{
                ...(isMe
                  ? { background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.2)", cursor: "pointer" }
                  : { background: "var(--color-surface)", cursor: "pointer" }),
              }}
              onClick={() => setCardUserId(entry.user_id)}
            >
              <span
                className="text-[13px] font-semibold w-5 text-center flex-shrink-0"
                style={{ color: isMe ? "var(--color-warm)" : "var(--color-muted)" }}
              >
                {entry.position}
              </span>

              <Avatar url={entry.avatar_url} initials={initials} size={28} />

              <span
                className="flex-1 text-[13px] truncate"
                style={{ color: isMe ? "var(--color-warm)" : "var(--color-fg)", fontWeight: isMe ? 500 : 400 }}
              >
                {isMe ? "Tú" : (entry.full_name ?? "—")}
              </span>

              {!isMe && (
                <span
                  className="text-[11px] font-medium mr-1 flex-shrink-0"
                  style={{ color: diff > 0 ? "#ef4444" : "#22c55e" }}
                >
                  {diff > 0 ? `+${diff}` : `${diff}`}
                </span>
              )}
              <span
                className="text-[13px] font-medium flex-shrink-0"
                style={{ color: isMe ? "var(--color-warm)" : "var(--color-fg)" }}
              >
                {entry.total_points}
              </span>
            </div>
          );
        })}
      </div>

      {insight && (
        <div
          className="flex items-start gap-2.5 rounded-[13px] px-3 py-2.5 mt-3"
          style={{ background: "rgba(207,92,54,0.08)", border: "1px solid rgba(207,92,54,0.2)" }}
        >
          <TrendingUp size={14} strokeWidth={1.5} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-[12px]" style={{ color: "var(--color-fg)", lineHeight: 1.5 }}>
            {insight}
          </p>
        </div>
      )}

      {/* Tarjeta de jugador al hacer clic en un rival */}
      {cardUserId && (
        <PlayerCard
          userId={cardUserId}
          groupId={groupId}
          currentUserId={userId}
          placeholder={lb.find((e) => e.user_id === cardUserId) ? {
            full_name: lb.find((e) => e.user_id === cardUserId)!.full_name,
            avatar_url: lb.find((e) => e.user_id === cardUserId)!.avatar_url,
          } : undefined}
          onClose={() => setCardUserId(null)}
        />
      )}
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────

export function SeasonWidget() {
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const groupIds = groups.map((g) => g.id);

  const { data: seasonsByGroup = {}, isLoading } = useActiveSeasonsByGroups(groupIds);

  // FIX: solo grupos con temporada activa YA iniciada
  const activeGroups = groups.filter((g) => {
    const s = seasonsByGroup[g.id];
    return s && computePhase(s).hasStarted;
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(24);
  const [hasScroll, setHasScroll] = useState(false);

  // Clamp index if activeGroups shrinks
  const clampedIdx = Math.min(activeIdx, Math.max(0, activeGroups.length - 1));

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollable = el.scrollWidth > el.clientWidth + 2;
    setHasScroll(scrollable);
    if (!scrollable) return;
    const trackW = 56;
    const ratio = el.clientWidth / el.scrollWidth;
    const tw = Math.max(18, Math.round(trackW * ratio));
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? el.scrollLeft / max : 0;
    setThumbWidth(tw);
    setThumbLeft(Math.round(p * (trackW - tw)));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateThumb);
    updateThumb();
    return () => el.removeEventListener("scroll", updateThumb);
  }, [updateThumb]);

  if (!user || isLoading || activeGroups.length === 0) return null;

  const activeGroup = activeGroups[clampedIdx];
  const activeSeason = seasonsByGroup[activeGroup.id];
  if (!activeSeason) return null;

  return (
    <div>
      {/* Título + selector de grupos */}
      <div className="mb-3 mt-1">
        <p className="text-[11px] uppercase tracking-wider mb-3" style={{ color: "var(--color-muted)" }}>
          Temporadas en curso
        </p>

        {activeGroups.length > 1 && (
          <>
            <div
              ref={scrollRef}
              className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-4"
              style={{ scrollSnapType: "x mandatory", scrollPaddingLeft: 16 }}
            >
              <div className="w-4 flex-shrink-0" />
              {activeGroups.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => setActiveIdx(i)}
                  className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] transition-colors"
                  style={{
                    scrollSnapAlign: "start",
                    background: i === clampedIdx ? "var(--color-warm)" : "var(--color-bg-card)",
                    color: i === clampedIdx ? "#1a1000" : "var(--color-muted)",
                    border: i === clampedIdx ? "none" : "1px solid var(--color-border)",
                    fontWeight: i === clampedIdx ? 500 : 400,
                  }}
                >
                  {g.name}
                </button>
              ))}
              <div className="w-4 flex-shrink-0" />
            </div>

            {/* Scroll indicator — solo si hay overflow real */}
            {hasScroll && (
              <div className="flex justify-center mt-2">
                <div className="relative w-14 h-1 rounded-full" style={{ background: "rgba(124,124,124,0.22)" }}>
                  <div
                    className="absolute top-0 h-1 rounded-full transition-all duration-150"
                    style={{ width: thumbWidth, left: thumbLeft, background: "var(--color-muted)" }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <SeasonCard
        key={activeGroup.id}
        season={activeSeason}
        groupName={activeGroup.name}
        groupId={activeGroup.id}
        userId={user.id}
      />
    </div>
  );
}
