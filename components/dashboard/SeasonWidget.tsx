"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { useActiveSeason, useSeasonLeaderboard, computePhase, type Season } from "@/lib/hooks/useSeasons";
import { useUser } from "@/lib/hooks/useUser";
import type { SeasonLeaderboardEntry } from "@/lib/hooks/useSeasons";

// ── Helper: días transcurridos / total ────────────────────────────────────

function seasonProgress(season: Season): { elapsed: number; total: number; pct: number } {
  const start = new Date(season.start_date + "T00:00:00").getTime();
  const end   = new Date(season.end_date   + "T23:59:59").getTime();
  const now   = Date.now();
  const total = Math.max(1, Math.round((end - start) / 86400000));
  const elapsed = Math.min(total, Math.max(0, Math.round((now - start) / 86400000)));
  return { elapsed, total, pct: Math.round((elapsed / total) * 100) };
}

// ── Helper: puntos posibles al día de hoy ────────────────────────────────

function possiblePts(season: Season): number {
  const { elapsed } = seasonProgress(season);
  return elapsed * 13;
}

// ── Helper: insight dinámico ──────────────────────────────────────────────

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

// ── Single group season card ──────────────────────────────────────────────

function SeasonCard({ groupId, groupName, userId }: { groupId: string; groupName: string; userId: string }) {
  const { data: season = null } = useActiveSeason(groupId);
  const { data: lb = [] } = useSeasonLeaderboard(season);

  if (!season) return null;

  const phase = computePhase(season);
  if (!phase.hasStarted) return null; // solo temporadas en curso

  const { elapsed, total, pct } = seasonProgress(season);
  const possible = possiblePts(season);
  const myEntry = lb.find((e) => e.user_id === userId);
  const myPos   = myEntry?.position ?? null;
  const myPts   = myEntry?.total_points ?? 0;

  // Rivales: 1 arriba + 1 abajo. Si soy 1°, los 2 de abajo.
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

  // Filas a mostrar: intercalar "yo" entre los rivales
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
      {/* Header: posición + nombre temporada */}
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

      {/* Puntos */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-display font-semibold text-[22px]" style={{ color: "var(--color-fg)" }}>
          {myPts}
        </span>
        <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
          / {possible} pts posibles
        </span>
        <span className="text-[11px] ml-auto" style={{ color: "var(--color-muted)" }}>
          Día {elapsed} de {total}
        </span>
      </div>

      {/* Barra de progreso de temporada */}
      <div className="h-[5px] rounded-full overflow-hidden mb-1" style={{ background: "var(--color-surface)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "var(--color-warm)" }}
        />
      </div>
      <div className="flex justify-between text-[10px] mb-3.5" style={{ color: "#555" }}>
        <span>Inicio</span>
        <span>{pct}% completado</span>
        <span>Fin</span>
      </div>

      {/* Divider */}
      <div className="h-px mb-3" style={{ background: "var(--color-border)" }} />

      {/* Tabla de rivales */}
      <div className="text-[11px] mb-2.5" style={{ color: "#555" }}>
        Posiciones cercanas
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => {
          const isMe = row === "me";
          const entry = isMe ? myEntry : row as SeasonLeaderboardEntry;
          if (!entry) return null;
          const diff = entry.total_points - myPts;
          const pos  = entry.position;
          return (
            <div
              key={isMe ? "me" : entry.user_id}
              className="flex items-center gap-2.5 rounded-[12px] px-3 py-2"
              style={
                isMe
                  ? { background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.2)" }
                  : { background: "var(--color-surface)" }
              }
            >
              <span
                className="text-[13px] font-semibold w-5 text-center flex-shrink-0"
                style={{ color: isMe ? "var(--color-warm)" : "var(--color-muted)" }}
              >
                {pos}
              </span>

              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                style={{
                  background: isMe ? "rgba(239,200,139,0.15)" : "var(--color-bg-card)",
                  color: isMe ? "var(--color-warm)" : "var(--color-fg)",
                }}
              >
                {(entry.full_name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </div>

              <span
                className="flex-1 text-[13px] truncate"
                style={{ color: isMe ? "var(--color-warm)" : "var(--color-fg)", fontWeight: isMe ? 500 : 400 }}
              >
                {isMe ? "Tú" : (entry.full_name?.split(" ")[0] ?? "—")}
              </span>

              {/* Diff + pts */}
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

      {/* Insight */}
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
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────

export function SeasonWidget() {
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [thumbLeft, setThumbLeft] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(24);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
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

  if (!user || groups.length === 0) return null;

  const activeGroup = groups[activeIdx] ?? groups[0];

  return (
    <div>
      {/* Pill selector scrollable */}
      {groups.length > 1 && (
        <>
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 mb-2"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {groups.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setActiveIdx(i)}
                className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] transition-colors"
                style={{
                  scrollSnapAlign: "start",
                  background: i === activeIdx ? "var(--color-warm)" : "var(--color-bg-card)",
                  color: i === activeIdx ? "#1a1000" : "var(--color-muted)",
                  border: i === activeIdx ? "none" : "1px solid var(--color-border)",
                  fontWeight: i === activeIdx ? 500 : 400,
                }}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center mb-3">
            <div className="relative w-14 h-1 rounded-full" style={{ background: "var(--color-surface)" }}>
              <div
                className="absolute top-0 h-1 rounded-full transition-all duration-150"
                style={{ width: thumbWidth, left: thumbLeft, background: "#7C7C7C" }}
              />
            </div>
          </div>
        </>
      )}

      {/* Card para el grupo activo */}
      <SeasonCard
        key={activeGroup.id}
        groupId={activeGroup.id}
        groupName={activeGroup.name}
        userId={user.id}
      />
    </div>
  );
}
