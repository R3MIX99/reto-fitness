"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Trophy, Crown, Users, ArrowLeft, TrendingUp, TrendingDown,
  Minus, Swords, Star, ShieldOff, AlertTriangle,
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

// Construye la serie de la gráfica: acumulado por día para cada grupo
function buildChartSeries(rows: LeagueGroupDaily[], groupIds: string[]) {
  if (!rows.length) return [];

  // Obtener fechas únicas ordenadas
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

function PlayerRow({
  rank,
  name,
  points,
  avatarUrl,
  isTop,
}: {
  rank: number;
  name: string | null;
  points: number;
  avatarUrl: string | null;
  isTop: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${isTop ? "bg-[var(--color-warm)]/10" : "bg-white/4"}`}>
      <div className="w-5 flex items-center justify-center shrink-0">
        {rank === 1 ? (
          <Crown className="w-3.5 h-3.5 text-[var(--color-warm)]" />
        ) : (
          <span className="font-display text-xs text-[var(--color-muted)]">{rank}</span>
        )}
      </div>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          referrerPolicy="no-referrer"
          className="w-7 h-7 rounded-full object-cover shrink-0"
          alt=""
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-display font-bold text-[var(--color-accent)]">
            {(name ?? "?")[0].toUpperCase()}
          </span>
        </div>
      )}
      <p className={`flex-1 font-display text-xs truncate ${isTop ? "font-semibold text-[var(--color-fg)]" : "text-[var(--color-fg)]"}`}>
        {name ?? "—"}
      </p>
      <span className={`font-display font-bold text-sm shrink-0 ${isTop ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
        {fmtPts(points)}
        <span className="text-[10px] font-normal text-[var(--color-muted)] ml-0.5">pts</span>
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
  const { data: dailyRows = [] } = useLeagueGroupDaily(id);
  const cancelLeague = useCancelLeague();

  const [confirmCancel, setConfirmCancel] = useState(false);

  // Buscar la liga en todas las entradas
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

  // Grupos ordenados por standing
  const groupA = standings[0];
  const groupB = standings[1];
  const leaderGroupId = groupA?.group_id;
  const myIsLeading = leaderGroupId === myGroupId;

  // Top players por grupo
  const playersA = groupA ? topPlayers.filter((p) => p.group_id === groupA.group_id) : [];
  const playersB = groupB ? topPlayers.filter((p) => p.group_id === groupB.group_id) : [];

  // Chart data
  const groupIds = standings.map((s) => s.group_id);
  const chartData = buildChartSeries(dailyRows, groupIds);

  // Stats
  const diff = groupA && groupB ? groupA.total_points - groupB.total_points : 0;
  const pctLead = groupB && groupB.total_points > 0
    ? Math.round(((groupA?.total_points ?? 0) / groupB.total_points - 1) * 100)
    : 0;

  const handleCancel = async () => {
    try {
      await cancelLeague.mutateAsync(id);
      router.replace("/liga");
    } catch {
      setConfirmCancel(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-28 space-y-4">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-[var(--color-muted)] mb-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Liga
      </button>

      {/* Liga nombre + estado */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
          <Swords className="w-5 h-5 text-[var(--color-warm)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-xl text-[var(--color-fg)] truncate">{league.name}</h1>
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

      {/* ─── Hero: Scores VS ─────────────────────────────────────────────── */}
      {standings.length >= 2 ? (
        <>
          {/* Motivational / countdown badge */}
          {isUpcoming ? (
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[var(--color-warm)]/15 text-[var(--color-warm)] text-sm font-display font-bold">
              <Trophy className="w-4 h-4" />
              {daysToStart === 1
                ? "La liga empieza mañana"
                : daysToStart === 0
                ? "La liga empieza hoy"
                : `La liga empieza en ${daysToStart} días`}
            </div>
          ) : isActive && myGroupId ? (
            <div className={`flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-display font-bold ${
              myIsLeading
                ? "bg-green-500/15 text-green-400"
                : diff === 0
                ? "bg-white/5 text-[var(--color-muted)]"
                : "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
            }`}>
              {myIsLeading ? (
                <>
                  <TrendingUp className="w-4 h-4" />
                  ¡Tu grupo va ganando!
                </>
              ) : diff === 0 ? (
                <>
                  <Minus className="w-4 h-4" />
                  ¡Empate! Todo puede pasar
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  ¡Ponle, puedes alcanzarlos!
                </>
              )}
            </div>
          ) : null}

          {/* Score card */}
          <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              {/* Grupo A */}
              <div className="text-center space-y-1">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate leading-tight">
                  {groupA.group_name}
                  {groupA.group_id === myGroupId && (
                    <span className="block text-[10px] text-[var(--color-accent)] font-body uppercase tracking-wider">tu grupo</span>
                  )}
                </p>
                <p className={`font-display font-bold text-3xl ${groupA.rank === 1 ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
                  {fmtPts(groupA.total_points)}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">pts totales</p>
                <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
                  <Users className="w-3 h-3" />
                  {groupA.member_count}
                </div>
              </div>

              {/* VS */}
              <div className="flex flex-col items-center gap-1">
                <Crown className="w-5 h-5 text-[var(--color-warm)]" />
                <p className="font-display font-bold text-lg text-[var(--color-muted)]">VS</p>
                {diff !== 0 && (
                  <span className={`text-[10px] font-display font-semibold px-2 py-0.5 rounded-full ${
                    groupA.rank === 1
                      ? "bg-[var(--color-warm)]/20 text-[var(--color-warm)]"
                      : "bg-white/5 text-[var(--color-muted)]"
                  }`}>
                    +{Math.abs(diff)}
                  </span>
                )}
              </div>

              {/* Grupo B */}
              <div className="text-center space-y-1">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate leading-tight">
                  {groupB.group_name}
                  {groupB.group_id === myGroupId && (
                    <span className="block text-[10px] text-[var(--color-accent)] font-body uppercase tracking-wider">tu grupo</span>
                  )}
                </p>
                <p className={`font-display font-bold text-3xl ${groupB.rank === 1 ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
                  {fmtPts(groupB.total_points)}
                </p>
                <p className="text-[11px] text-[var(--color-muted)]">pts totales</p>
                <div className="flex items-center justify-center gap-1 text-[11px] text-[var(--color-muted)]">
                  <Users className="w-3 h-3" />
                  {groupB.member_count}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Stats rápidas ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-3 text-center">
              <p className="font-display font-bold text-lg text-[var(--color-fg)]">
                {Math.abs(diff)}
              </p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">pts de ventaja</p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-3 text-center">
              <p className="font-display font-bold text-lg text-[var(--color-fg)]">
                {groupA.member_count + groupB.member_count}
              </p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">jugadores</p>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-2xl p-3 text-center">
              <p className={`font-display font-bold text-lg ${pctLead > 0 ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
                {pctLead > 0 ? `+${pctLead}%` : "—"}
              </p>
              <p className="text-[11px] text-[var(--color-muted)] mt-0.5">% de ventaja</p>
            </div>
          </div>

          {/* ─── Top 3 jugadores por grupo ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { group: groupA, players: playersA },
              { group: groupB, players: playersB },
            ].map(({ group, players }, gi) => (
              <div key={group.group_id} className="bg-[var(--color-bg-card)] rounded-[20px] p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: GROUP_COLORS[gi] }}
                  />
                  <p className="font-display font-semibold text-xs text-[var(--color-fg)] truncate">
                    {group.group_name}
                  </p>
                  {group.rank === 1 && (
                    <Crown className="w-3 h-3 text-[var(--color-warm)] shrink-0 ml-auto" />
                  )}
                </div>
                {players.length === 0 ? (
                  <p className="text-[11px] text-[var(--color-muted)] text-center py-2">Sin datos aún</p>
                ) : (
                  <div className="space-y-1.5">
                    {players.map((p) => (
                      <PlayerRow
                        key={p.user_id}
                        rank={p.player_rank}
                        name={p.full_name}
                        points={p.points}
                        avatarUrl={p.avatar_url}
                        isTop={p.player_rank === 1}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ─── Gráfica comparativa ────────────────────────────────────────── */}
          {chartData.length > 0 && (
            <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)]">Puntos por día</p>
                <div className="flex items-center gap-3">
                  {standings.map((s, i) => (
                    <div key={s.group_id} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[i] }} />
                      <span className="text-[10px] text-[var(--color-muted)] truncate max-w-[60px]">{s.group_name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => fmtDate(v)}
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#141414",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "#EEE5E9",
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
            </div>
          )}

          {/* ─── Por qué va ganando ─────────────────────────────────────────── */}
          {diff !== 0 && groupA && groupB && (
            <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[var(--color-warm)]" />
                <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
                  ¿Por qué va ganando {groupA.group_name}?
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-[var(--color-muted)]">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  Llevan <strong className="text-[var(--color-fg)]">{fmtPts(diff)} pts</strong> de ventaja acumulada
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
                    Su mejor jugador lleva <strong className="text-[var(--color-fg)]">{fmtPts(playersA[0].points)} pts</strong>
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      ) : (
        /* Esperando grupos */
        <div className="bg-[var(--color-bg-card)] rounded-[20px] p-6 text-center space-y-2">
          <Trophy className="w-8 h-8 text-[var(--color-warm)] mx-auto" />
          <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
            Esperando que los grupos acepten
          </p>
          <p className="text-xs text-[var(--color-muted)]">
            La batalla comienza cuando ambos grupos hayan aceptado.
          </p>
        </div>
      )}

      {/* ─── Gestión (solo creador) ─────────────────────────────────────────── */}
      {isCreator && isActive && (
        <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4 space-y-3">
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
  );
}
