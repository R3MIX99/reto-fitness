"use client";

import { useState } from "react";
import { Trophy, Calendar, Clock, Flag, ChevronRight } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import {
  useActiveSeason,
  useStartSeason,
  computePhase,
  localDateStr,
  DURATION_OPTIONS,
  type Season,
} from "@/lib/hooks/useSeasons";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

// ── Banner principal ─────────────────────────────────────────────────────────

export function SeasonBanner({
  groupId,
  isOwner,
}: {
  groupId: string;
  isOwner: boolean;
}) {
  const { data: season, isLoading } = useActiveSeason(groupId);
  const [startOpen, setStartOpen] = useState(false);

  if (isLoading) {
    return <div className="h-[78px] bg-[var(--color-bg-card)] rounded-[18px] mb-3 animate-pulse" />;
  }

  // Sin temporada en curso
  if (!season) {
    return (
      <>
        <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3 border" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-surface)" }}>
              <Trophy size={17} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">Sin temporada activa</p>
              <p className="text-[12px] text-[var(--color-muted)]">
                {isOwner ? "Inicia una temporada para empezar a competir." : "Espera a que el dueño inicie una temporada."}
              </p>
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setStartOpen(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 bg-accent text-white text-[13px] font-medium rounded-[12px] py-2.5"
            >
              <Flag size={14} strokeWidth={1.5} />
              Iniciar temporada
            </button>
          )}
        </div>
        {isOwner && (
          <StartSeasonDrawer
            open={startOpen}
            groupId={groupId}
            onClose={() => setStartOpen(false)}
          />
        )}
      </>
    );
  }

  // Temporada en curso (active | reviewing)
  const phase = computePhase(season);
  const isReviewing = season.status === "reviewing";

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3 border" style={{ borderColor: "rgba(239,200,139,0.35)" }}>
      <div className="flex items-center gap-3 mb-2.5">
        <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.18)" }}>
          <Trophy size={17} strokeWidth={1.5} className="text-warm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate">{season.name}</p>
          <p className="text-[12px] text-[var(--color-muted)] flex items-center gap-1.5">
            <Calendar size={11} strokeWidth={1.5} />
            {fmt(season.start_date)} – {fmt(season.end_date)}
          </p>
        </div>
        <span
          className="text-[11px] font-medium rounded-full px-2.5 py-1 flex-shrink-0"
          style={{
            background: isReviewing ? "rgba(207,92,54,0.15)" : "rgba(239,200,139,0.15)",
            color: isReviewing ? "var(--color-accent)" : "var(--color-warm)",
          }}
        >
          {isReviewing ? "En revisión" : `Fase ${phase.currentPhase}/${phase.totalPhases}`}
        </span>
      </div>

      {/* Barra de fases */}
      <div className="flex gap-1 mb-2">
        {Array.from({ length: phase.totalPhases }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{
              background: i < phase.currentPhase - 1
                ? "var(--color-warm)"
                : i === phase.currentPhase - 1 && phase.hasStarted && !isReviewing
                ? "var(--color-warm)"
                : "var(--color-border)",
              opacity: i === phase.currentPhase - 1 && phase.hasStarted && !isReviewing ? 0.6 : 1,
            }}
          />
        ))}
      </div>

      <p className="text-[12px] text-[var(--color-muted)] flex items-center gap-1.5">
        <Clock size={11} strokeWidth={1.5} />
        {!phase.hasStarted
          ? `Empieza en ${phase.daysUntilStart} día${phase.daysUntilStart !== 1 ? "s" : ""}`
          : isReviewing
          ? "Cerrando auditorías pendientes…"
          : `${phase.daysLeftInSeason} día${phase.daysLeftInSeason !== 1 ? "s" : ""} restantes en la temporada`}
      </p>
    </div>
  );
}

// ── Drawer para iniciar temporada ─────────────────────────────────────────────

function StartSeasonDrawer({
  open,
  groupId,
  onClose,
}: {
  open: boolean;
  groupId: string;
  onClose: () => void;
}) {
  const startSeason = useStartSeason();
  const [weeks, setWeeks] = useState<number>(4);
  const [startDate, setStartDate] = useState<string>(localDateStr(new Date()));
  const [error, setError] = useState<string | null>(null);

  // Fecha de fin calculada para previsualizar
  const endPreview = (() => {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + weeks * 7 - 1);
    return localDateStr(d);
  })();

  async function handleStart() {
    setError(null);
    try {
      await startSeason.mutateAsync({ groupId, durationWeeks: weeks, startDate });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar la temporada");
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-medium text-[18px] mb-1">Iniciar temporada</p>
        <p className="text-[12px] text-[var(--color-muted)] mb-4">
          Los miembros actuales del grupo quedarán inscritos. Quien se una después competirá en la siguiente temporada.
        </p>

        {/* Fecha de inicio */}
        <label className="text-[12px] text-[var(--color-muted)] mb-1.5 block">Fecha de inicio</label>
        <input
          type="date"
          value={startDate}
          min={localDateStr(new Date())}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-[var(--color-surface)] rounded-[12px] px-3.5 py-3 text-[14px] text-[var(--color-fg)] outline-none mb-4 border"
          style={{ borderColor: "var(--color-border)" }}
        />

        {/* Duración */}
        <label className="text-[12px] text-[var(--color-muted)] mb-1.5 block">Duración</label>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.weeks}
              onClick={() => setWeeks(opt.weeks)}
              className="rounded-[12px] py-2.5 text-[13px] font-medium transition-colors border"
              style={{
                background: weeks === opt.weeks ? "var(--color-accent)" : "var(--color-surface)",
                color: weeks === opt.weeks ? "white" : "var(--color-fg)",
                borderColor: weeks === opt.weeks ? "var(--color-accent)" : "var(--color-border)",
              }}
            >
              {opt.label.replace(" mes", "m").replace("es", "")}
            </button>
          ))}
        </div>

        {/* Resumen */}
        <div className="rounded-[12px] p-3 mb-4 flex items-center gap-2.5" style={{ background: "var(--color-surface)" }}>
          <Calendar size={15} strokeWidth={1.5} className="text-warm flex-shrink-0" />
          <p className="text-[12px] text-[var(--color-fg)]">
            {fmt(startDate)} → {fmt(endPreview)} · {weeks} semanas ({weeks} fase{weeks !== 1 ? "s" : ""})
          </p>
        </div>

        {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

        <button
          onClick={handleStart}
          disabled={startSeason.isPending}
          className="w-full flex items-center justify-center gap-1.5 bg-accent text-white text-[14px] font-medium rounded-pill py-3.5 disabled:opacity-50"
        >
          <Flag size={15} strokeWidth={1.5} />
          {startSeason.isPending ? "Iniciando…" : "Iniciar temporada"}
          {!startSeason.isPending && <ChevronRight size={15} strokeWidth={1.5} />}
        </button>
      </div>
    </Drawer>
  );
}
