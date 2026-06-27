"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy, Crown, Users, Plus, ChevronRight,
  Check, X, Swords, ShieldOff,
} from "lucide-react";
import {
  useAllLeagues,
  useLeagueStandings,
  useRespondLeagueInvite,
  useLeagueRealtime,
  type LeagueEntry,
} from "@/lib/hooks/useLeague";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { usePlan } from "@/lib/hooks/usePlan";
import { useUser } from "@/lib/hooks/useUser";
import { CreateLeagueDrawer } from "@/components/grupo/CreateLeagueDrawer";

// ── Fecha helpers ──────────────────────────────────────────────────────────

function todayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseLocalDate(s: string) {
  const d = new Date(s + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(s: string) {
  return Math.ceil((parseLocalDate(s).getTime() - todayLocal().getTime()) / 86_400_000);
}

function leagueSubtitle(startDate: string, pendingCount: number) {
  const days = daysUntil(startDate);
  let dateLabel: string;
  if (days > 1) dateLabel = `Empieza en ${days} días`;
  else if (days === 1) dateLabel = "Empieza mañana";
  else if (days === 0) dateLabel = "Empieza hoy";
  else {
    dateLabel = `En curso desde ${new Date(startDate + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })}`;
  }
  if (pendingCount > 0) dateLabel += ` · ${pendingCount} invitación pendiente`;
  return dateLabel;
}

// ── Standings inline card ──────────────────────────────────────────────────

function StandingsCard({ entry, onOpen }: { entry: LeagueEntry; onOpen: () => void }) {
  const { data: standings = [], isLoading } = useLeagueStandings(entry.league.id);
  const accepted = entry.league.participants.filter((p) => p.status === "accepted");
  const pending  = entry.league.participants.filter((p) => p.status === "pending");

  return (
    <button
      onClick={onOpen}
      className="w-full bg-[var(--color-bg-card)] rounded-[20px] p-4 text-left space-y-3"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-[var(--color-warm)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate">
            {entry.league.name}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5">
            {leagueSubtitle(entry.league.start_date, pending.length)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
      </div>

      {/* Mini standings */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : standings.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)] text-center py-2">
          Esperando que los grupos acepten…
        </p>
      ) : (
        <div className="space-y-1.5">
          {standings.map((s) => {
            const isMe = s.group_id === entry.myGroupId;
            return (
              <div
                key={s.group_id}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
                  isMe ? "bg-[var(--color-accent)]/10" : "bg-white/3"
                }`}
              >
                <div className="w-4 flex items-center justify-center shrink-0">
                  {s.rank === 1
                    ? <Crown className="w-3.5 h-3.5 text-[var(--color-warm)]" />
                    : <span className="font-display text-xs text-[var(--color-muted)]">{s.rank}</span>
                  }
                </div>
                <p className={`flex-1 font-display text-xs truncate ${
                  isMe ? "text-[var(--color-fg)] font-semibold" : "text-[var(--color-fg)]"
                }`}>
                  {s.group_name}
                  {isMe && <span className="ml-1 text-[10px] text-[var(--color-accent)]">tú</span>}
                </p>
                <span className={`font-display font-bold text-sm ${
                  s.rank === 1 ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"
                }`}>
                  {s.total_points.toLocaleString()}
                  <span className="text-[10px] font-normal text-[var(--color-muted)] ml-0.5">pts</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── Finished league card ───────────────────────────────────────────────────

function FinishedLeagueCard({ entry, onOpen }: { entry: LeagueEntry; onOpen: () => void }) {
  const { data: standings = [] } = useLeagueStandings(entry.league.id);
  const winner = standings.find((s) => s.rank === 1);
  const myStanding = standings.find((s) => s.group_id === entry.myGroupId);
  const iChampion = myStanding?.rank === 1;

  return (
    <button
      onClick={onOpen}
      className="w-full bg-[var(--color-bg-card)] rounded-[20px] p-4 text-left"
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          iChampion ? "bg-[var(--color-warm)]/20" : "bg-white/5"
        }`}>
          {iChampion ? (
            <Crown className="w-4 h-4 text-[var(--color-warm)]" />
          ) : (
            <Trophy className="w-4 h-4 text-[var(--color-muted)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate">
            {entry.league.name}
          </p>
          <p className="text-[11px] text-[var(--color-muted)] mt-0.5 flex items-center gap-1">
            {iChampion && <Crown className="w-3 h-3 text-[var(--color-warm)]" />}
            {iChampion
              ? "¡Ganaste esta liga!"
              : winner
              ? `Ganó: ${winner.group_name}`
              : "Finalizada"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

// ── Keyframes para el toast de cancelación ────────────────────────────────
const CANCEL_STYLES = `
@keyframes toastPop {
  0%   { opacity: 0; transform: translateY(32px) scale(0.88); }
  55%  { transform: translateY(-6px) scale(1.03); }
  80%  { transform: translateY(2px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ringPulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
  70%  { box-shadow: 0 0 0 20px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
.toast-pop  { animation: toastPop 0.6s cubic-bezier(0.22,1,0.36,1) both; }
.ring-pulse { animation: ringPulse 1.4s ease-out 0.4s 2; }
`;

function CancelToast({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CANCEL_STYLES }} />
      <div
        className="fixed inset-0 z-[400] flex items-center justify-center px-8 pointer-events-none"
        style={{ background: "rgba(0,0,0,0.60)", backdropFilter: "blur(6px)" }}
      >
        <div
          className="toast-pop flex flex-col items-center gap-4 rounded-3xl px-10 py-8 text-center"
          style={{
            background: "#120303",
            border: "1px solid rgba(239,68,68,0.35)",
            boxShadow: "0 28px 72px rgba(0,0,0,0.75)",
          }}
        >
          <div className="ring-pulse w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-red-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <p className="font-display font-bold text-lg text-[var(--color-fg)]">Liga cancelada</p>
            <p className="text-xs text-[var(--color-muted)]">La liga fue cancelada y ya no está activa.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LigaPage() {
  return (
    <Suspense fallback={null}>
      <LigaInner />
    </Suspense>
  );
}

function LigaInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showCancelToast, setShowCancelToast] = useState(
    searchParams.get("cancelled") === "1"
  );

  function dismissCancelToast() {
    setShowCancelToast(false);
    // Limpiar el param de la URL sin recargar
    router.replace("/liga");
  }

  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const { data: plan } = usePlan();
  const { data, isLoading } = useAllLeagues();
  const respond = useRespondLeagueInvite();
  useLeagueRealtime();

  const [showCreate, setShowCreate] = useState(false);
  const [createGroupId, setCreateGroupId] = useState<string | null>(null);

  const isElite = plan?.tier === "elite" || plan?.is_super_admin === true;
  const active = data?.active ?? [];
  const finished = data?.finished ?? [];
  const pending = data?.pending ?? [];

  // Grupos donde soy dueño (para poder crear liga)
  const ownedGroups = groups.filter((g) => g.owner_id === user?.id);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-4 pt-6 pb-28 space-y-3 animate-pulse">
        <div className="h-8 w-40 bg-[var(--color-bg-card)] rounded-xl" />
        <div className="h-32 bg-[var(--color-bg-card)] rounded-[20px]" />
        <div className="h-24 bg-[var(--color-bg-card)] rounded-[20px]" />
      </div>
    );
  }

  const hasAnything = active.length > 0 || finished.length > 0 || pending.length > 0;

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!hasAnything) {
    if (isElite && ownedGroups.length > 0) {
      return (
        <>
          {showCancelToast && <CancelToast onDone={dismissCancelToast} />}
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-warm)]/15 flex items-center justify-center">
              <Swords className="w-9 h-9 text-[var(--color-warm)]" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-[var(--color-fg)] mb-2">
                Liga entre grupos
              </h1>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto">
                Reta a otro grupo Elite y compiten acumulando puntos durante la temporada.
                El grupo con más puntos gana.
              </p>
            </div>
            <button
              onClick={() => {
                setCreateGroupId(ownedGroups[0].id);
                setShowCreate(true);
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[var(--color-accent)] text-white font-display font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Crear primera liga
            </button>
          </div>

          {showCreate && createGroupId && (
            <CreateLeagueDrawer
              open={showCreate}
              onClose={() => setShowCreate(false)}
              groupId={createGroupId}
            />
          )}
        </>
      );
    }

    // Miembro sin liga
    return (
      <>
        {showCancelToast && <CancelToast onDone={dismissCancelToast} />}
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-5">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center">
          <Swords className="w-9 h-9 text-[var(--color-muted)]" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-fg)] mb-2">
            Sin liga activa
          </h1>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed max-w-xs mx-auto">
            {isElite
              ? "Aún no has creado ni recibido ninguna liga."
              : "Espera a que el líder de tu grupo cree una batalla entre grupos."}
          </p>
        </div>
      </div>
      </>
    );
  }

  // ── Main content ─────────────────────────────────────────────────────────
  return (
    <>
      {showCancelToast && <CancelToast onDone={dismissCancelToast} />}
      <div className="px-4 pt-6 pb-28 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--color-warm)]" />
            <h1 className="font-display font-bold text-xl text-[var(--color-fg)]">Liga</h1>
          </div>
          {isElite && ownedGroups.length > 0 && (
            <button
              onClick={() => {
                setCreateGroupId(ownedGroups[0].id);
                setShowCreate(true);
              }}
              className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] font-display font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva liga
            </button>
          )}
        </div>

        {/* Invitaciones pendientes */}
        {pending.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-display px-1">
              Invitaciones pendientes
            </p>
            {pending.map((inv: any) => (
              <div key={inv.id} className="bg-[var(--color-warm)]/10 rounded-[20px] p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Trophy className="w-4 h-4 text-[var(--color-warm)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
                      {inv.league?.name ?? "Liga"}
                    </p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">
                      Invitado por <strong className="text-[var(--color-fg)]">
                        {inv.league?.owner_group?.name ?? "otro grupo"}
                      </strong>
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {inv.league?.start_date
                        ? leagueSubtitle(inv.league.start_date, 0)
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond.mutate({ leagueId: inv.league_id, groupId: inv.group_id, accept: true })}
                    disabled={respond.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-display font-semibold disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aceptar
                  </button>
                  <button
                    onClick={() => respond.mutate({ leagueId: inv.league_id, groupId: inv.group_id, accept: false })}
                    disabled={respond.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 text-[var(--color-muted)] text-xs font-display font-semibold disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ligas activas */}
        {active.length > 0 && (
          <div className="space-y-2">
            {active.length > 0 && (
              <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-display px-1">
                En curso
              </p>
            )}
            {active.map((entry) => (
              <StandingsCard
                key={entry.league.id}
                entry={entry}
                onOpen={() => router.push(`/liga/${entry.league.id}`)}
              />
            ))}
          </div>
        )}

        {/* Historial */}
        {finished.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-display px-1">
              Historial
            </p>
            {finished.map((entry) => (
              <FinishedLeagueCard
                key={entry.league.id}
                entry={entry}
                onOpen={() => router.push(`/liga/${entry.league.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && createGroupId && (
        <CreateLeagueDrawer
          open={showCreate}
          onClose={() => setShowCreate(false)}
          groupId={createGroupId}
        />
      )}
    </>
  );
}
