"use client";

import { useState } from "react";
import Image from "next/image";
import { History, ChevronRight, ChevronDown, Trophy, Ban } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import {
  useSeasonHistory,
  useSeasonStandings,
  computePhase,
  seasonTitle,
  type Season,
  type PodiumEntry,
} from "@/lib/hooks/useSeasons";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function durationLabel(weeks: number): string {
  const months = Math.round(weeks / 4);
  return `${months} mes${months !== 1 ? "es" : ""}`;
}

const MEDAL: Record<number, string> = { 1: "#EFC88B", 2: "#C0C0C0", 3: "#CD7F32" };

type SeasonView = "active" | "reviewing" | "finished" | "cancelled" | "scheduled";

function viewOf(season: Season): SeasonView {
  if (season.status === "active") {
    return computePhase(season).hasStarted ? "active" : "scheduled";
  }
  return season.status as SeasonView;
}

const BADGE: Record<SeasonView, { label: string; color: string; bg: string }> = {
  active:    { label: "En curso",   color: "var(--color-warm)",   bg: "rgba(239,200,139,0.15)" },
  reviewing: { label: "En revisión", color: "var(--color-accent)", bg: "rgba(207,92,54,0.15)" },
  finished:  { label: "Finalizada", color: "#22c55e",             bg: "rgba(34,197,94,0.12)" },
  cancelled: { label: "Cancelada",  color: "#ef4444",             bg: "rgba(239,68,68,0.12)" },
  scheduled: { label: "Programada", color: "var(--color-muted)",  bg: "var(--color-surface)" },
};

// ── Trigger + drawer ──────────────────────────────────────────────────────────

export function SeasonHistory({ groupId }: { groupId: string }) {
  const { data: seasons = [] } = useSeasonHistory(groupId);
  const [open, setOpen] = useState(false);
  // Acordeón: solo una temporada abierta a la vez
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleSeason(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  // Cerrar acordeón al cerrar el drawer
  function handleClose() {
    setOpen(false);
    setExpandedId(null);
  }

  if (seasons.length === 0) return null;

  // Número de display: solo cuentan las temporadas no-canceladas, en orden cronológico
  const displayNumbers = new Map<string, number>();
  let counter = 0;
  [...seasons]
    .sort((a, b) => a.season_number - b.season_number)
    .forEach((s) => {
      if (s.status !== "cancelled") {
        counter++;
        displayNumbers.set(s.id, counter);
      }
    });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-[var(--color-bg-card)] rounded-[16px] px-4 py-3.5 mb-3 border"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-surface)" }}>
          <History size={15} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </div>
        <span className="text-[14px] font-medium flex-1 text-left">Historial de temporadas</span>
        <span className="text-[12px] text-[var(--color-muted)]">{seasons.length}</span>
        <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </button>

      <Drawer open={open} onClose={handleClose}>
        {/* El drawer ya tiene maxHeight 92dvh — este div hace el scroll */}
        <div className="flex flex-col overflow-hidden" style={{ maxHeight: "calc(92dvh - 40px)" }}>
          <p className="font-display font-medium text-[18px] px-5 pt-1 pb-4 flex-shrink-0">Temporadas</p>
          <div className="flex flex-col gap-2.5 overflow-y-auto no-scrollbar px-5 pb-8">
            {seasons.map((s) => (
              <SeasonRow
                key={s.id}
                season={s}
                displayNumber={displayNumbers.get(s.id) ?? null}
                expanded={expandedId === s.id}
                onToggle={() => toggleSeason(s.id)}
              />
            ))}
          </div>
        </div>
      </Drawer>
    </>
  );
}

// ── Fila de temporada (expandible) ────────────────────────────────────────────

function SeasonRow({ season, displayNumber, expanded, onToggle }: { season: Season; displayNumber: number | null; expanded: boolean; onToggle: () => void }) {
  const view = viewOf(season);
  const badge = BADGE[view];
  const expandable = view === "finished" || view === "cancelled";

  return (
    <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
      <button
        onClick={() => expandable && onToggle()}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
        disabled={!expandable}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate">
            {view === "cancelled"
              ? "Temporada cancelada"
              : displayNumber
              ? `Temporada ${displayNumber}`
              : season.name}
          </p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {fmt(season.start_date)} – {fmt(season.end_date)} · {durationLabel(season.duration_weeks)}
          </p>
        </div>
        <span className="text-[11px] font-medium rounded-full px-2.5 py-1 flex-shrink-0" style={{ color: badge.color, background: badge.bg }}>
          {badge.label}
        </span>
        {expandable && (
          expanded
            ? <ChevronDown size={15} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0" />
            : <ChevronRight size={15} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0" />
        )}
      </button>

      {expanded && view === "finished" && <FinishedStandings seasonId={season.id} />}
      {expanded && view === "cancelled" && (
        <div className="px-3.5 pb-3.5 flex items-start gap-2.5">
          <Ban size={14} strokeWidth={1.5} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--color-muted)]">
            Terminada antes de tiempo{season.cancel_reason ? `: ${season.cancel_reason}` : "."} Sin títulos entregados.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Tabla final de una temporada finalizada ───────────────────────────────────

function FinishedStandings({ seasonId }: { seasonId: string }) {
  const { data: standings = [], isLoading } = useSeasonStandings(seasonId);

  if (isLoading) {
    return <div className="px-3.5 pb-3.5"><div className="h-16 rounded-[10px] animate-pulse" style={{ background: "var(--color-surface)" }} /></div>;
  }
  if (!standings.length) {
    return <p className="px-3.5 pb-3.5 text-[12px] text-[var(--color-muted)]">Sin datos del podio.</p>;
  }

  return (
    <div className="px-3.5 pb-3 divide-border">
      {standings.map((e: PodiumEntry) => (
        <div key={e.user_id} className="flex items-center gap-3 py-2">
          <span
            className="w-5 text-center text-[12px] font-bold flex-shrink-0"
            style={{ color: MEDAL[e.rank] ?? "var(--color-muted)" }}
          >
            {e.rank}
          </span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: "var(--color-surface)" }}>
            {e.avatar_url
              ? <Image src={e.avatar_url} alt={e.full_name ?? ""} width={28} height={28} className="object-cover" unoptimized={e.avatar_url.includes("?t=")} referrerPolicy="no-referrer" />
              : <span className="text-[10px] font-medium text-[var(--color-muted)]">{getInitials(e.full_name)}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] truncate">{e.full_name ?? "Jugador"}</p>
            {seasonTitle(e.rank, e.gender) && (
              <p className="text-[10px]" style={{ color: MEDAL[e.rank] }}>{seasonTitle(e.rank, e.gender)}</p>
            )}
          </div>
          {e.rank === 1 && <Trophy size={13} strokeWidth={1.5} className="text-warm flex-shrink-0" />}
          <span className="text-[12px] text-[var(--color-muted)] flex-shrink-0">{e.total_points} pts</span>
        </div>
      ))}
    </div>
  );
}
