"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Trophy, Crown, Users, ArrowLeft, TrendingUp, TrendingDown,
  Minus, Swords, Star, ShieldOff, AlertTriangle, Flame, Zap, CheckCircle2,
} from "lucide-react";
import {
  useAllLeagues,
  useLeagueStandings,
  useLeagueTopPlayers,
  useLeagueGroupDaily,
  useCancelLeague,
  type LeagueGroupDaily,
} from "@/lib/hooks/useLeague";
import { useUser } from "@/lib/hooks/useUser";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { useState } from "react";

// ── Animación keyframes ────────────────────────────────────────────────────

const STYLES = `
@keyframes slideUp {
  from { opacity: 0; transform: translateY(32px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes vsImpact {
  0%   { opacity: 0; transform: scale(2.2) rotate(-8deg); }
  55%  { transform: scale(0.92) rotate(2deg); }
  75%  { transform: scale(1.06) rotate(-1deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes scoreReveal {
  0%   { opacity: 0; transform: translateY(16px) scale(0.85); }
  60%  { transform: translateY(-4px) scale(1.05); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,200,139,0); }
  50%       { box-shadow: 0 0 24px 6px rgba(239,200,139,0.18); }
}
@keyframes badgePop {
  0%   { opacity: 0; transform: scale(0.7) translateY(8px); }
  65%  { transform: scale(1.08) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes statPop {
  0%   { opacity: 0; transform: scale(0.75); }
  70%  { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes winnerGlow {
  0%, 100% { text-shadow: 0 0 0px rgba(239,200,139,0); }
  50%       { text-shadow: 0 0 20px rgba(239,200,139,0.6); }
}
.animate-su   { animation: slideUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
.animate-fi   { animation: fadeIn 0.4s ease both; }
.animate-vs   { animation: vsImpact 0.7s cubic-bezier(0.22,1,0.36,1) both; }
.animate-sc   { animation: scoreReveal 0.6s cubic-bezier(0.22,1,0.36,1) both; }
.animate-bp   { animation: badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
.animate-sp   { animation: statPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }
@keyframes toastPop {
  0%   { opacity: 0; transform: translateY(32px) scale(0.88); }
  55%  { transform: translateY(-6px) scale(1.03); }
  80%  { transform: translateY(2px) scale(0.99); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ringPulse {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
  70%  { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
.animate-toast { animation: toastPop 0.6s cubic-bezier(0.22,1,0.36,1) both; }
.animate-ring  { animation: ringPulse 1.4s ease-out 0.5s 2; }
.animate-glow { animation: glowPulse 2.4s ease-in-out 2; }
.animate-wg   { animation: winnerGlow 2s ease-in-out 2; }
.shimmer-text {
  background: linear-gradient(90deg, #EFC88B 0%, #fff8e7 40%, #EFC88B 60%, #CF5C36 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 2.5s linear infinite;
}
`;

function delay(ms: number): React.CSSProperties {
  return { animationDelay: `${ms}ms` };
}

// ── Utilidades ─────────────────────────────────────────────────────────────

function fmtDate(str: string) {
  return new Date(str + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short" });
}

function fmtPts(n: number) {
  return n.toLocaleString();
}

function todayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseLocalDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateStr: string) {
  return Math.ceil(
    (parseLocalDate(dateStr).getTime() - todayLocal().getTime()) / 86_400_000
  );
}

type DisplayStatus = "upcoming" | "active" | "finished" | "cancelled";

function getDisplayStatus(status: string, startDate: string): DisplayStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "finished") return "finished";
  if (parseLocalDate(startDate) > todayLocal()) return "upcoming";
  return "active";
}

function buildChartSeries(rows: LeagueGroupDaily[], groupIds: string[]) {
  if (!rows.length) return [];
  const dates = Array.from(new Set(rows.map((r) => r.score_date))).sort();
  return dates.map((date) => {
    const entry: Record<string, any> = { date };
    for (const gid of groupIds) {
      const row = rows.find((r) => r.score_date === date && r.group_id === gid);
      entry[gid] = row ? row.day_points : 0;
    }
    return entry;
  });
}

// ── Componentes internos ───────────────────────────────────────────────────

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  const initials = (name ?? "?")[0].toUpperCase();
  if (!url) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
        <span className="text-xs font-display font-bold text-[var(--color-accent)]">{initials}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      className="w-8 h-8 rounded-full object-cover shrink-0"
      alt=""
      onError={(e) => {
        const el = e.currentTarget;
        el.style.display = "none";
        const fb = el.nextElementSibling as HTMLElement | null;
        if (fb) fb.style.display = "flex";
      }}
    />
  );
}

function PlayerRow({
  rank, name, points, avatarUrl, isTop, style,
}: {
  rank: number; name: string | null; points: number;
  avatarUrl: string | null; isTop: boolean; style?: React.CSSProperties;
}) {
  const initials = (name ?? "?")[0].toUpperCase();
  return (
    <div
      className={`animate-su flex items-center gap-3 rounded-xl px-3 py-3 ${isTop ? "bg-[var(--color-warm)]/10" : "bg-white/4"}`}
      style={style}
    >
      {/* Posición */}
      <div className="w-5 flex items-center justify-center shrink-0">
        {rank === 1
          ? <Crown className="w-3.5 h-3.5 text-[var(--color-warm)]" />
          : <span className="font-display text-xs text-[var(--color-muted)]">{rank}</span>}
      </div>

      {/* Avatar con fallback inline */}
      <div className="relative shrink-0">
        {avatarUrl ? (
          <>
            <img
              src={avatarUrl}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              className="w-8 h-8 rounded-full object-cover"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "flex";
              }}
            />
            <div
              className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 items-center justify-center hidden"
            >
              <span className="text-xs font-display font-bold text-[var(--color-accent)]">{initials}</span>
            </div>
          </>
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
            <span className="text-xs font-display font-bold text-[var(--color-accent)]">{initials}</span>
          </div>
        )}
      </div>

      {/* Nombre */}
      <p className={`flex-1 font-display text-sm min-w-0 truncate ${isTop ? "font-semibold text-[var(--color-fg)]" : "text-[var(--color-fg)]"}`}>
        {name ?? "—"}
      </p>

      {/* Puntos */}
      <span className={`font-display font-bold text-base shrink-0 ${isTop ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
        {fmtPts(points)}
        <span className="text-[11px] font-normal text-[var(--color-muted)] ml-0.5">pts</span>
      </span>
    </div>
  );
}

const GROUP_COLORS = ["#CF5C36", "#EFC88B"];

// ── Página principal ───────────────────────────────────────────────────────

export default function BattlePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUser();

  const { data: leaguesData, isLoading: loadingLeagues } = useAllLeagues();
  const { data: standings = [] } = useLeagueStandings(id);
  const { data: topPlayers = [] } = useLeagueTopPlayers(id);
  const { data: dailyRows = [], isLoading: loadingDaily, error: dailyError } = useLeagueGroupDaily(id);
  const cancelLeague = useCancelLeague();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelToast, setCancelToast] = useState(false);

  const allEntries = [
    ...(leaguesData?.active ?? []),
    ...(leaguesData?.finished ?? []),
  ];
  const entry = allEntries.find((e) => e.league.id === id);
  const league = entry?.league;

  if (loadingLeagues) {
    return (
      <div className="px-4 pt-6 pb-28 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-[var(--color-bg-card)] rounded-xl" />
        <div className="h-40 bg-[var(--color-bg-card)] rounded-[20px]" />
        <div className="h-64 bg-[var(--color-bg-card)] rounded-[20px]" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <ShieldOff className="w-12 h-12 text-[var(--color-muted)]" />
        <p className="text-[var(--color-muted)] text-sm">No se encontró esta liga.</p>
        <button onClick={() => router.back()} className="text-xs text-[var(--color-accent)]">Volver</button>
      </div>
    );
  }

  const displayStatus = getDisplayStatus(league.status, league.start_date);
  const isActive = displayStatus === "active";
  const isUpcoming = displayStatus === "upcoming";
  const isCreator = league.created_by === user?.id;
  const daysToStart = isUpcoming ? daysUntil(league.start_date) : 0;
  const myGroupId = entry?.myGroupId ?? "";

  const groupA = standings[0];
  const groupB = standings[1];
  const myIsLeading = groupA?.group_id === myGroupId;

  const playersA = groupA ? topPlayers.filter((p) => p.group_id === groupA.group_id) : [];
  const playersB = groupB ? topPlayers.filter((p) => p.group_id === groupB.group_id) : [];

  const groupIds = standings.map((s) => s.group_id);
  const chartData = buildChartSeries(dailyRows, groupIds);

  const diff = groupA && groupB ? groupA.total_points - groupB.total_points : 0;
  const pctLead = groupB && groupB.total_points > 0
    ? Math.round(((groupA?.total_points ?? 0) / groupB.total_points - 1) * 100)
    : 0;

  const handleCancel = async () => {
    try {
      await cancelLeague.mutateAsync(id);
      setConfirmCancel(false);
      setCancelToast(true);
      setTimeout(() => router.replace("/liga"), 2400);
    } catch {
      setConfirmCancel(false);
    }
  };

  return (
    <>
      {/* Keyframes inyectados una sola vez */}
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Toast de cancelación */}
      {cancelToast && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center px-8 pointer-events-none" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <div className="animate-toast flex flex-col items-center gap-4 rounded-3xl px-10 py-8 text-center" style={{ background: "#110404", border: "1px solid rgba(239,68,68,0.35)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
            <div className="animate-ring w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-red-400" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-lg text-[var(--color-fg)]">Liga cancelada</p>
              <p className="text-xs text-[var(--color-muted)]">La liga fue cancelada y ya no está activa.</p>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-6 pb-28 space-y-4">

        {/* Back ── fade rápido */}
        <button
          onClick={() => router.back()}
          className="animate-fi flex items-center gap-1.5 text-xs text-[var(--color-muted)] mb-1"
          style={delay(0)}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Liga
        </button>

        {/* Header ── slide up */}
        <div className="animate-su flex items-start gap-3" style={delay(60)}>
          <div className="animate-glow w-10 h-10 rounded-2xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-[var(--color-warm)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-[var(--color-fg)] truncate">
              {league.name}
            </h1>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              {displayStatus === "upcoming"
                ? `Empieza el ${fmtDate(league.start_date)}`
                : `Desde el ${fmtDate(league.start_date)}`}
              {league.end_date && ` · hasta ${fmtDate(league.end_date)}`}
              {" · "}
              <span className={`font-semibold ${
                isActive ? "text-green-400" :
                isUpcoming ? "text-[var(--color-warm)]" :
                displayStatus === "cancelled" ? "text-red-400" :
                "text-[var(--color-muted)]"
              }`}>
                {isActive ? "En curso"
                  : isUpcoming ? "Próximamente"
                  : displayStatus === "cancelled" ? "Cancelada"
                  : "Finalizada"}
              </span>
            </p>
          </div>
        </div>

        {/* ─── Hero ──────────────────────────────────────────────────────────── */}
        {standings.length >= 2 ? (
          <>
            {/* Badge motivacional / countdown ── pop */}
            {isUpcoming ? (
              <div className="animate-bp flex items-center justify-center gap-2 py-3 rounded-2xl bg-[var(--color-warm)]/15 text-[var(--color-warm)] text-sm font-display font-bold" style={delay(120)}>
                <Trophy className="w-4 h-4" />
                {daysToStart === 1 ? "La liga empieza mañana"
                  : daysToStart === 0 ? "La liga empieza hoy"
                  : `La liga empieza en ${daysToStart} días`}
              </div>
            ) : isActive && myGroupId ? (
              <div
                className={`animate-bp flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-display font-bold ${
                  myIsLeading
                    ? "bg-green-500/15 text-green-400"
                    : diff === 0
                    ? "bg-white/5 text-[var(--color-muted)]"
                    : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                }`}
                style={delay(120)}
              >
                {myIsLeading ? (
                  <><Flame className="w-4 h-4" />¡Tu grupo va ganando!</>
                ) : diff === 0 ? (
                  <><Minus className="w-4 h-4" />¡Empate! Todo puede pasar</>
                ) : (
                  <><Zap className="w-4 h-4" />¡Ponle, puedes alcanzarlos!</>
                )}
              </div>
            ) : null}

            {/* Score card VS ── impacto */}
            <div className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-5 animate-glow" style={delay(180)}>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">

                {/* Grupo A */}
                <div className="text-center space-y-1.5">
                  <p className="font-display font-semibold text-sm text-[var(--color-fg)] leading-tight line-clamp-2">
                    {groupA.group_name}
                  </p>
                  {groupA.group_id === myGroupId && (
                    <span className="inline-block text-[10px] text-[var(--color-accent)] font-body uppercase tracking-wider">
                      tu grupo
                    </span>
                  )}
                  <p
                    className={`animate-sc font-display font-bold text-4xl ${
                      groupA.rank === 1 ? "animate-wg text-[var(--color-warm)]" : "text-[var(--color-fg)]"
                    }`}
                    style={delay(320)}
                  >
                    {fmtPts(groupA.total_points)}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">pts</p>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
                    <Users className="w-3 h-3" />{groupA.member_count}
                  </div>
                </div>

                {/* VS */}
                <div className="animate-vs flex flex-col items-center gap-2" style={delay(260)}>
                  <Crown className="w-6 h-6 text-[var(--color-warm)]" />
                  <p className="shimmer-text font-display font-bold text-2xl">VS</p>
                  {diff !== 0 && (
                    <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-full ${
                      groupA.rank === 1
                        ? "bg-[var(--color-warm)]/25 text-[var(--color-warm)]"
                        : "bg-white/5 text-[var(--color-muted)]"
                    }`}>
                      +{Math.abs(diff)}
                    </span>
                  )}
                </div>

                {/* Grupo B */}
                <div className="text-center space-y-1.5">
                  <p className="font-display font-semibold text-sm text-[var(--color-fg)] leading-tight line-clamp-2">
                    {groupB.group_name}
                  </p>
                  {groupB.group_id === myGroupId && (
                    <span className="inline-block text-[10px] text-[var(--color-accent)] font-body uppercase tracking-wider">
                      tu grupo
                    </span>
                  )}
                  <p
                    className={`animate-sc font-display font-bold text-4xl ${
                      groupB.rank === 1 ? "animate-wg text-[var(--color-warm)]" : "text-[var(--color-fg)]"
                    }`}
                    style={delay(380)}
                  >
                    {fmtPts(groupB.total_points)}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)]">pts</p>
                  <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
                    <Users className="w-3 h-3" />{groupB.member_count}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats rápidas ── pop escalonado */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "pts ventaja", value: Math.abs(diff).toString(), warm: false },
                { label: "jugadores", value: String(groupA.member_count + groupB.member_count), warm: false },
                { label: "% ventaja", value: pctLead > 0 ? `+${pctLead}%` : "—", warm: pctLead > 0 },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className="animate-sp bg-[var(--color-bg-card)] rounded-2xl p-3 text-center"
                  style={delay(460 + i * 60)}
                >
                  <p className={`font-display font-bold text-lg ${s.warm ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
                    {s.value}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Top 3 jugadores ── uno arriba del otro */}
            <div className="space-y-3">
              {[
                { group: groupA, players: playersA },
                { group: groupB, players: playersB },
              ].map(({ group, players }, gi) => (
                <div
                  key={group.group_id}
                  className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-2"
                  style={delay(640 + gi * 80)}
                >
                  {/* Header del grupo */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GROUP_COLORS[gi] }} />
                    <p className="font-display font-semibold text-sm text-[var(--color-fg)] flex-1">
                      {group.group_name}
                    </p>
                    {group.rank === 1 && (
                      <div className="flex items-center gap-1 bg-[var(--color-warm)]/15 rounded-full px-2 py-0.5">
                        <Crown className="w-3 h-3 text-[var(--color-warm)]" />
                        <span className="text-[10px] font-display font-semibold text-[var(--color-warm)]">Lider</span>
                      </div>
                    )}
                  </div>
                  {players.length === 0 ? (
                    <p className="text-xs text-[var(--color-muted)] text-center py-3">Sin datos aún</p>
                  ) : (
                    <div className="space-y-2">
                      {players.map((p, pi) => (
                        <PlayerRow
                          key={p.user_id}
                          rank={p.player_rank}
                          name={p.full_name}
                          points={p.points}
                          avatarUrl={p.avatar_url}
                          isTop={p.player_rank === 1}
                          style={delay(720 + gi * 80 + pi * 60)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gráfica comparativa ── siempre visible */}
            <div className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-3" style={delay(880)}>
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)]">Puntos por día</p>
                <div className="flex items-center gap-3">
                  {standings.map((s, i) => (
                    <div key={s.group_id} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[i] }} />
                      <span className="text-[10px] text-[var(--color-muted)] truncate max-w-[64px]">{s.group_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {loadingDaily ? (
                <div className="h-[140px] flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--color-warm)] border-t-transparent animate-spin" />
                </div>
              ) : dailyError ? (
                <div className="h-[100px] flex flex-col items-center justify-center gap-2 text-center">
                  <p className="text-xs text-red-400">Error al cargar la gráfica.</p>
                  <p className="text-[11px] text-[var(--color-muted)] max-w-[220px]">
                    Asegúrate de haber aplicado la migración <span className="font-mono text-[10px]">20260626_league_battle.sql</span> en Supabase.
                  </p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-[100px] flex flex-col items-center justify-center gap-1.5 text-center">
                  <TrendingUp className="w-6 h-6 text-[var(--color-muted)]" />
                  <p className="text-xs text-[var(--color-muted)]">
                    {isUpcoming
                      ? "Los datos aparecerán cuando la liga empiece."
                      : "Aún no hay puntos acumulados en esta liga."}
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => fmtDate(v)}
                      tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                      axisLine={false} tickLine={false} interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#141414",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12, fontSize: 12, color: "#EEE5E9",
                      }}
                      formatter={(val: number, key: string) => {
                        const s = standings.find((st) => st.group_id === key);
                        return [`${val} pts`, s?.group_name ?? key];
                      }}
                      labelFormatter={(label) => fmtDate(label)}
                    />
                    {standings.map((s, i) => (
                      <Line
                        key={s.group_id}
                        type="monotone"
                        dataKey={s.group_id}
                        stroke={GROUP_COLORS[i]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ¿Por qué va ganando? ── slide up */}
            {diff !== 0 && groupA && groupB && (
              <div className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-2.5" style={delay(960)}>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[var(--color-warm)]" />
                  <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
                    ¿Por qué va ganando <span className="text-[var(--color-warm)]">{groupA.group_name}</span>?
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-[var(--color-muted)]">
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    Llevan <strong className="text-[var(--color-fg)] mx-0.5">{fmtPts(diff)} pts</strong> de ventaja acumulada
                  </li>
                  {groupA.member_count !== groupB.member_count && (
                    <li className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-[var(--color-warm)] shrink-0" />
                      {groupA.member_count > groupB.member_count
                        ? `Tienen más miembros activos (${groupA.member_count} vs ${groupB.member_count})`
                        : `Con menos miembros (${groupA.member_count} vs ${groupB.member_count}) y aun así van ganando`}
                    </li>
                  )}
                  {playersA[0] && (
                    <li className="flex items-center gap-2">
                      <Crown className="w-3.5 h-3.5 text-[var(--color-warm)] shrink-0" />
                      Su mejor jugador lleva <strong className="text-[var(--color-fg)] mx-0.5">{fmtPts(playersA[0].points)} pts</strong>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        ) : (
          /* Esperando grupos */
          <div className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-6 text-center space-y-2" style={delay(200)}>
            <Trophy className="w-8 h-8 text-[var(--color-warm)] mx-auto" />
            <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
              Esperando que los grupos acepten
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              La batalla comienza cuando ambos grupos hayan aceptado.
            </p>
          </div>
        )}

        {/* Gestión (solo creador) ── slide up al final */}
        {isCreator && isActive && (
          <div className="animate-su bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-3" style={delay(1040)}>
            <p className="font-display font-semibold text-sm text-[var(--color-fg)]">Gestionar liga</p>
            {confirmCancel ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 rounded-xl px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  ¿Confirmas cancelar la liga? Esta acción no se puede deshacer.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelLeague.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-display font-semibold disabled:opacity-50"
                  >
                    {cancelLeague.isPending ? "Cancelando…" : "Sí, cancelar"}
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 text-[var(--color-muted)] text-xs font-display font-semibold"
                  >
                    Atrás
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-xs font-display font-semibold"
              >
                <ShieldOff className="w-3.5 h-3.5" />
                Cancelar liga
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
