"use client";

import { useState } from "react";
import Image from "next/image";
import { Flame, Dumbbell, UtensilsCrossed, Target, ChevronDown, ChevronUp } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useMyGroups, useGlobalLeaderboard, useTodayScore, useStreak, getInitials } from "@/lib/hooks/useGroups";
import { useGoals, useTodayChecks } from "@/lib/hooks/useChecklist";

const TOTAL_PTS = 13;
const ORDINALS = ["1ero", "2do", "3ero", "4to", "5to", "6to", "7mo", "8vo", "9no", "10mo"];

const DIAS_CORTOS = ["dom","lun","mar","mié","jue","vie","sáb"];
function getNextSunday(): string {
  const d = new Date();
  const diff = d.getDay() === 0 ? 7 : 7 - d.getDay();
  d.setDate(d.getDate() + diff);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${DIAS_CORTOS[d.getDay()]} ${dia}/${mes}`;
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ url, initials, size = 26 }: { url?: string | null; initials: string; size?: number }) {
  if (url) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
        <Image src={url} alt={initials} width={size} height={size} className="object-cover w-full h-full" unoptimized={url.includes("?t=")} />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-medium"
      style={{ width: size, height: size, background: "var(--color-surface)", color: "var(--color-fg)", fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ── Leaderboard Row ────────────────────────────────────────────────────────

function PlayerRow({
  position,
  full_name,
  avatar_url,
  total_points,
  isCurrent,
  isLast,
}: {
  position: number;
  full_name: string | null;
  avatar_url: string | null;
  total_points: number;
  isCurrent: boolean;
  isLast: boolean;
}) {
  const initials = getInitials(full_name);
  const ordinal = ORDINALS[position - 1] ?? `${position}°`;
  const isFirst = position === 1;

  return (
    <div
      className="flex items-center gap-2.5 py-2.5"
      style={{ borderBottom: isLast ? "none" : "0.5px solid var(--color-border)" }}
    >
      <Avatar url={avatar_url} initials={initials} size={28} />

      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <span className="text-[13px] truncate">{full_name ?? "—"}</span>
        {isCurrent && (
          <span className="text-[10px] text-warm">(tú)</span>
        )}
      </div>

      <span
        className="text-[11px] rounded-full px-2.5 py-0.5 flex-shrink-0"
        style={{
          color: isFirst ? "#EFC88B" : "#7C7C7C",
          border: isFirst ? "0.5px solid rgba(239,200,139,0.5)" : "0.5px solid var(--color-border)",
        }}
      >
        {ordinal}
      </span>

      <span className="text-[13px] text-[var(--color-muted)] w-[46px] text-right flex-shrink-0">
        {total_points} pts
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 3;

export default function DashboardPage() {
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const groupId = groups[0]?.id ?? null;
  const groupIds = groups.map((g) => g.id);
  const [showAll, setShowAll] = useState(false);

  const { data: todayPts = 0 } = useTodayScore(groupId);
  const { data: streak = 0 } = useStreak(groupId);
  const { data: leaderboard = [] } = useGlobalLeaderboard(groupIds);

  // If no one has scored yet, show all unique members from all groups at 0 pts
  const allMembers = groups.flatMap((g) => g.members);
  const uniqueMembers = Array.from(new Map(allMembers.map((m) => [m.user_id, m])).values());
  const effectiveLeaderboard = leaderboard.length > 0
    ? leaderboard
    : uniqueMembers.map((m, i) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        total_points: 0,
        position: i + 1,
        is_leader: i === 0,
      }));

  const visibleLeaderboard = showAll ? effectiveLeaderboard : effectiveLeaderboard.slice(0, PREVIEW_COUNT);
  const hasMore = effectiveLeaderboard.length > PREVIEW_COUNT;

  const { data: goals = [] } = useGoals();
  const { data: todayChecks = [] } = useTodayChecks(groupId);

  const pct = Math.min(100, Math.round((todayPts / TOTAL_PTS) * 100));
  // Pending tasks
  const gymDone = todayChecks.some((c) => c.kind === "gym");
  const pendingItems: { icon: React.ReactNode; label: string }[] = [];
  if (!gymDone) {
    pendingItems.push({ icon: <Dumbbell size={13} strokeWidth={1.5} className="text-accent" />, label: "Ejercicio de hoy" });
  }
  goals.filter((g) => g.kind === "diet").forEach((g) => {
    const done = todayChecks.some((c) => c.goal_id === g.id);
    if (!done) pendingItems.push({ icon: <UtensilsCrossed size={13} strokeWidth={1.5} className="text-warm" />, label: g.title });
  });
  goals.filter((g) => g.kind === "goal").forEach((g) => {
    const done = todayChecks.some((c) => c.goal_id === g.id);
    if (!done) pendingItems.push({ icon: <Target size={13} strokeWidth={1.5} className="text-warm" />, label: g.title });
  });

  // Find rival: the person just above current user in leaderboard
  const myEntry = effectiveLeaderboard.find((e) => e.user_id === user?.id);
  const myPos = myEntry?.position ?? 0;
  const rival = myPos > 1 ? effectiveLeaderboard.find((e) => e.position === myPos - 1) : effectiveLeaderboard.find((e) => e.user_id !== user?.id);

  // Streak message
  function streakMsg() {
    if (streak === 0) return "Completa el día de hoy para comenzar tu racha.";
    if (streak === 1) return "Llevas 1 día de racha. ¡Sigue mañana!";
    if (streak === 2) return `Llevas ${streak} días de racha. ¡Uno más y ganas +3 pts!`;
    if (streak >= 3) return `¡Racha de ${streak} días! Bonus de +3 pts activo.`;
    return `Llevas ${streak} días de racha.`;
  }

  return (
    <div className="px-4 pt-2 pb-28 space-y-3">

      {/* Puntos del día */}
      <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[10.5px] text-[var(--color-muted)]">Puntos de hoy</span>
          <span className="text-[10.5px] text-warm">cierra el {getNextSunday()}</span>
        </div>
        <div className="font-display font-medium text-[30px] mb-2.5">
          {todayPts}<span className="text-[var(--color-muted)] text-[18px]"> / {TOTAL_PTS}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#EFC88B,#EEE5E9)" }}
          />
        </div>
        <p className="text-[11px] text-[var(--color-muted)] mt-2.5">{streakMsg()}</p>
      </div>

      {/* Mini tarjetas */}
      <div className="flex gap-2.5">
        {/* Racha */}
        <div className="flex-1 bg-[var(--color-bg-card)] rounded-[18px] p-3.5">
          <div className="flex items-center gap-2.5">
            <Flame size={22} strokeWidth={1.5} className="text-accent flex-shrink-0" />
            <div>
              <p className="text-[10.5px] text-[var(--color-muted)]">Racha</p>
              <p className="font-display font-medium text-[15px]">
                {streak} {streak === 1 ? "día" : "días"}
              </p>
            </div>
          </div>
        </div>

        {/* Rival */}
        <div className="flex-1 bg-[var(--color-bg-card)] rounded-[18px] p-3.5">
          <p className="text-[10.5px] text-[var(--color-muted)] mb-0.5">Tu rival</p>
          {rival ? (
            <p className="font-display font-medium text-[15px] truncate">
              {rival.full_name?.split(" ")[0] ?? "—"} · {rival.total_points} pts
            </p>
          ) : (
            <p className="font-display font-medium text-[15px] text-[var(--color-muted)]">Sin rival</p>
          )}
        </div>
      </div>

      {/* Tareas pendientes */}
      {pendingItems.length > 0 && groupId && (
        <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-3">
            Pendientes hoy · {pendingItems.length} {pendingItems.length === 1 ? "tarea" : "tareas"}
          </p>
          <div className="flex flex-col gap-0">
            {pendingItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: i < pendingItems.length - 1 ? "0.5px solid var(--color-border)" : "none" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-surface)" }}>
                  {item.icon}
                </div>
                <span className="text-[13px] flex-1">{item.label}</span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--color-border)" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {effectiveLeaderboard.length > 0 && (
        <div>
          <p className="text-[12px] text-[var(--color-muted)] mb-1.5">Tabla de jugadores</p>
          <div className="bg-[var(--color-bg-card)] rounded-[18px] px-4">
            {visibleLeaderboard.map((entry, i) => (
              <PlayerRow
                key={entry.user_id}
                position={entry.position}
                full_name={entry.full_name}
                avatar_url={entry.avatar_url}
                total_points={entry.total_points}
                isCurrent={entry.user_id === user?.id}
                isLast={i === visibleLeaderboard.length - 1 && !hasMore}
              />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="w-full flex items-center justify-center gap-1.5 mt-2 py-2.5 text-[13px] text-[var(--color-muted)] bg-[var(--color-bg-card)] rounded-[14px]"
            >
              {showAll ? (
                <><ChevronUp size={14} strokeWidth={1.5} /> Ver menos</>
              ) : (
                <><ChevronDown size={14} strokeWidth={1.5} /> Ver {effectiveLeaderboard.length - PREVIEW_COUNT} más</>
              )}
            </button>
          )}
        </div>
      )}

      {!groupId && (
        <p className="text-[13px] text-[var(--color-muted)] text-center pt-4">
          Únete a un grupo para ver el ranking.
        </p>
      )}
    </div>
  );
}
