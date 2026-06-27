"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Calendar, Clock, Flag, ChevronRight, Settings2, Pencil, Trash2, AlertTriangle, Crown } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import {
  useActiveSeason,
  useSeasonHistory,
  useStartSeason,
  useUpdateScheduledSeason,
  useDeleteScheduledSeason,
  useCancelSeason,
  computePhase,
  localDateStr,
  DURATION_OPTIONS,
  type Season,
} from "@/lib/hooks/useSeasons";
import { usePlan } from "@/lib/hooks/usePlan";
import { useSeasonCustomTitle } from "@/lib/hooks/useCustomTitle";

// Número de display de una temporada: cuenta solo las no-canceladas en orden cronológico
function useSeasonDisplayName(groupId: string, season: Season | null | undefined): string | null {
  const { data: allSeasons = [] } = useSeasonHistory(groupId);
  if (!season) return null;
  if (season.status === "cancelled") return "Temporada cancelada";

  let counter = 0;
  const sorted = [...allSeasons].sort((a, b) => a.season_number - b.season_number);
  for (const s of sorted) {
    if (s.status !== "cancelled") {
      counter++;
      if (s.id === season.id) return `Temporada ${counter}`;
    }
  }
  // Fallback si la temporada activa todavía no está en el historial (está en curso)
  const cancelledBefore = sorted.filter(
    (s) => s.status === "cancelled" && s.season_number < season.season_number
  ).length;
  return `Temporada ${season.season_number - cancelledBefore}`;
}

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
  const displayName = useSeasonDisplayName(groupId, season);
  const [startOpen, setStartOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

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
  const notStarted = !phase.hasStarted;

  return (
    <>
      <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3 border" style={{ borderColor: "rgba(239,200,139,0.35)" }}>
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.18)" }}>
            <Trophy size={17} strokeWidth={1.5} className="text-warm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium truncate">{displayName ?? season.name}</p>
            <p className="text-[12px] text-[var(--color-muted)] flex items-center gap-1.5">
              <Calendar size={11} strokeWidth={1.5} />
              {fmt(season.start_date)} – {fmt(season.end_date)}
            </p>
          </div>
          {isOwner && (
            <button
              onClick={() => setManageOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)] flex-shrink-0"
              style={{ background: "var(--color-surface)" }}
              aria-label="Gestionar temporada"
            >
              <Settings2 size={15} strokeWidth={1.5} />
            </button>
          )}
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

        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[var(--color-muted)] flex items-center gap-1.5">
            <Clock size={11} strokeWidth={1.5} />
            {notStarted
              ? `Empieza en ${phase.daysUntilStart} día${phase.daysUntilStart !== 1 ? "s" : ""}`
              : isReviewing
              ? "Cerrando auditorías pendientes…"
              : `${phase.daysLeftInSeason} día${phase.daysLeftInSeason !== 1 ? "s" : ""} restantes en la temporada`}
          </p>
          {!notStarted && !isReviewing && (
            <span className="text-[11px] font-medium text-warm">
              Fase {phase.currentPhase}/{phase.totalPhases}
            </span>
          )}
          {notStarted && (
            <span className="text-[11px] font-medium text-[var(--color-muted)]">Programada</span>
          )}
        </div>
      </div>

      {isOwner && (
        <ManageSeasonDrawer
          open={manageOpen}
          season={season}
          displayName={displayName ?? season.name}
          notStarted={notStarted}
          onClose={() => setManageOpen(false)}
        />
      )}
    </>
  );
}

// ── Campos compartidos (fecha + duración) ─────────────────────────────────────

function ScheduleFields({
  startDate,
  setStartDate,
  weeks,
  setWeeks,
}: {
  startDate: string;
  setStartDate: (v: string) => void;
  weeks: number;
  setWeeks: (v: number) => void;
}) {
  const endPreview = (() => {
    const d = new Date(startDate + "T12:00:00");
    d.setDate(d.getDate() + weeks * 7 - 1);
    return localDateStr(d);
  })();

  return (
    <>
      <label className="text-[12px] text-[var(--color-muted)] mb-1.5 block">Fecha de inicio</label>
      <input
        type="date"
        value={startDate}
        min={localDateStr(new Date())}
        onChange={(e) => setStartDate(e.target.value)}
        className="w-full bg-[var(--color-surface)] rounded-[12px] px-3.5 py-3 text-[14px] text-[var(--color-fg)] outline-none mb-4 border"
        style={{ borderColor: "var(--color-border)" }}
      />

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
            {opt.label.replace(" meses", "m").replace(" mes", "m")}
          </button>
        ))}
      </div>

      <div className="rounded-[12px] p-3 mb-4 flex items-center gap-2.5" style={{ background: "var(--color-surface)" }}>
        <Calendar size={15} strokeWidth={1.5} className="text-warm flex-shrink-0" />
        <p className="text-[12px] text-[var(--color-fg)]">
          {fmt(startDate)} → {fmt(endPreview)} · {weeks} semanas ({weeks} fase{weeks !== 1 ? "s" : ""})
        </p>
      </div>
    </>
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
  const router      = useRouter();
  const startSeason = useStartSeason();
  const { data: plan } = usePlan();
  const isElite = plan?.tier === "elite" || plan?.is_super_admin === true;

  const [weeks,     setWeeks]     = useState<number>(4);
  const [startDate, setStartDate] = useState<string>(localDateStr(new Date()));
  const [error,     setError]     = useState<string | null>(null);

  async function handleStart() {
    setError(null);
    try {
      const seasonId = await startSeason.mutateAsync({ groupId, durationWeeks: weeks, startDate });
      onClose();
      if (isElite) {
        router.push(`/grupo/${groupId}/titulo/${seasonId}`);
      }
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

        <ScheduleFields startDate={startDate} setStartDate={setStartDate} weeks={weeks} setWeeks={setWeeks} />

        {/* Aviso Elite: el título se configura en la siguiente pantalla */}
        {isElite && (
          <div className="mb-4 flex items-center gap-2.5 rounded-[12px] px-3.5 py-3" style={{ background: "rgba(239,200,139,0.06)", border: "1px solid rgba(239,200,139,0.2)" }}>
            <Crown size={14} strokeWidth={1.5} className="text-warm flex-shrink-0" />
            <p className="text-[12px] text-[var(--color-muted)]">
              Después podrás configurar el <span className="text-warm font-medium">título del campeón</span>.
            </p>
          </div>
        )}

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

// ── Drawer para gestionar la temporada (dueño) ────────────────────────────────

function ManageSeasonDrawer({
  open,
  season,
  displayName,
  notStarted,
  onClose,
}: {
  open: boolean;
  season: Season;
  displayName: string;
  notStarted: boolean;
  onClose: () => void;
}) {
  const router      = useRouter();
  const updateSeason = useUpdateScheduledSeason();
  const deleteSeason = useDeleteScheduledSeason();
  const cancelSeason = useCancelSeason();
  const { data: existingCustomTitle } = useSeasonCustomTitle(season.id);
  const { data: plan } = usePlan();
  const isElite = plan?.tier === "elite" || plan?.is_super_admin === true;

  const [editing,       setEditing]       = useState(false);
  const [weeks,         setWeeks]         = useState<number>(season.duration_weeks);
  const [startDate,     setStartDate]     = useState<string>(season.start_date);
  const [reason,        setReason]        = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStop,   setConfirmStop]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // texto de preview del título existente (puede ser gendered o default)
  const existingTitlePreview = existingCustomTitle?.title_text
    ?? existingCustomTitle?.title_text_male
    ?? null;

  function reset() {
    setEditing(false);
    setConfirmDelete(false);
    setConfirmStop(false);
    setReason("");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function handleSave() {
    setError(null);
    try {
      await updateSeason.mutateAsync({
        seasonId: season.id,
        groupId: season.group_id,
        durationWeeks: weeks,
        startDate,
      });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteSeason.mutateAsync({ seasonId: season.id, groupId: season.group_id });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cancelar");
    }
  }

  async function handleStop() {
    setError(null);
    try {
      await cancelSeason.mutateAsync({ seasonId: season.id, groupId: season.group_id, reason });
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo terminar la temporada");
    }
  }

  return (
    <Drawer open={open} onClose={close}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-medium text-[18px] mb-1">Gestionar temporada</p>
        <p className="text-[12px] text-[var(--color-muted)] mb-4 truncate">{displayName}</p>

        {/* ── Temporada AÚN NO empieza: editar o cancelar programación ── */}
        {notStarted ? (
          editing ? (
            <>
              <ScheduleFields startDate={startDate} setStartDate={setStartDate} weeks={weeks} setWeeks={setWeeks} />
              {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditing(false); setError(null); }}
                  className="flex-1 text-[13px] text-[var(--color-muted)] rounded-pill py-3 border"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Atrás
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateSeason.isPending}
                  className="flex-1 bg-accent text-white text-[13px] font-medium rounded-pill py-3 disabled:opacity-50"
                >
                  {updateSeason.isPending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </>
          ) : confirmDelete ? (
            <>
              <div className="rounded-[12px] p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertTriangle size={16} strokeWidth={1.5} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[var(--color-fg)]">
                  Se eliminará la temporada programada y se avisará a los jugadores. Podrás crear otra cuando quieras.
                </p>
              </div>
              {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 text-[13px] text-[var(--color-muted)] rounded-pill py-3 border"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Atrás
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteSeason.isPending}
                  className="flex-1 text-[13px] font-medium text-red-400 rounded-pill py-3 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {deleteSeason.isPending ? "Cancelando…" : "Sí, cancelar"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setEditing(true)}
                className="w-full flex items-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[14px]"
                style={{ background: "var(--color-surface)" }}
              >
                <Pencil size={15} strokeWidth={1.5} className="text-warm" />
                Editar fecha y duración
              </button>
              {isElite && (
                <button
                  onClick={() => { close(); router.push(`/grupo/${season.group_id}/titulo/${season.id}`); }}
                  className="w-full flex items-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[14px]"
                  style={{ background: "var(--color-surface)" }}
                >
                  <Crown size={15} strokeWidth={1.5} className="text-warm" />
                  <span className="flex-1 text-left">Título del campeón</span>
                  {existingTitlePreview && (
                    <span className="text-[11px] text-warm truncate max-w-[100px]">{existingTitlePreview}</span>
                  )}
                </button>
              )}
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[14px] text-red-400"
                style={{ background: "rgba(239,68,68,0.08)" }}
              >
                <Trash2 size={15} strokeWidth={1.5} />
                Cancelar temporada programada
              </button>
            </div>
          )
        ) : (
          /* ── Temporada EN CURSO ── */
          confirmStop ? (
            <>
              <div className="rounded-[12px] p-3.5 mb-4 flex items-start gap-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                <AlertTriangle size={16} strokeWidth={1.5} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[var(--color-fg)]">
                  Al terminar antes de tiempo <strong>no se entregan títulos</strong>. Se avisará a todos los jugadores con la razón. Tendrás que iniciar una nueva temporada.
                </p>
              </div>
              <label className="text-[12px] text-[var(--color-muted)] mb-1.5 block">Razón (se enviará a todos)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Hubo un problema con las reglas, reiniciamos…"
                rows={3}
                className="w-full bg-[var(--color-surface)] rounded-[12px] px-3.5 py-3 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none resize-none mb-4 border"
                style={{ borderColor: "var(--color-border)" }}
              />
              {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmStop(false); setError(null); }}
                  className="flex-1 text-[13px] text-[var(--color-muted)] rounded-pill py-3 border"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  Atrás
                </button>
                <button
                  onClick={handleStop}
                  disabled={cancelSeason.isPending || reason.trim().length === 0}
                  className="flex-1 text-[13px] font-medium text-red-400 rounded-pill py-3 disabled:opacity-40"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {cancelSeason.isPending ? "Terminando…" : "Terminar temporada"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              {isElite && (
                <button
                  onClick={() => { close(); router.push(`/grupo/${season.group_id}/titulo/${season.id}`); }}
                  className="w-full flex items-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[14px]"
                  style={{ background: "var(--color-surface)" }}
                >
                  <Crown size={15} strokeWidth={1.5} className="text-warm" />
                  <span className="flex-1 text-left">Título del campeón</span>
                  {existingTitlePreview && (
                    <span className="text-[11px] text-warm truncate max-w-[100px]">{existingTitlePreview}</span>
                  )}
                </button>
              )}
              <button
                onClick={() => setConfirmStop(true)}
                className="w-full flex items-center gap-2.5 rounded-[12px] px-4 py-3.5 text-[14px] text-red-400"
                style={{ background: "rgba(239,68,68,0.08)" }}
              >
                <Flag size={15} strokeWidth={1.5} />
                Terminar temporada antes de tiempo
              </button>
            </div>
          )
        )}
      </div>
    </Drawer>
  );
}
