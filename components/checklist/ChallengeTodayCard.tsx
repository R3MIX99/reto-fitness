"use client";

import { useState } from "react";
import { Flag, Users } from "lucide-react";
import type { GroupWithMembers } from "@/lib/hooks/useGroups";
import { useChallengesForGroups, occursOn, todayLocalStr, type Challenge } from "@/lib/hooks/useChallenges";
import { ChallengeDetailDrawer } from "@/components/grupo/ChallengeDetailDrawer";
import { AttendanceDrawer } from "@/components/grupo/AttendanceDrawer";

// Reto grupal del día en el checklist (arriba del ejercicio). Solo el día que toca.
// Si varios grupos tienen reto hoy, muestra píldoras deslizables para cambiar.
export function ChallengeTodayCard({ groups, userId }: { groups: GroupWithMembers[]; userId: string | undefined }) {
  const groupIds = groups.map((g) => g.id);
  const { data: challenges = [] } = useChallengesForGroups(groupIds);
  const [sel, setSel] = useState(0);
  const [detailFor, setDetailFor] = useState<Challenge | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<{ challenge: Challenge; members: GroupWithMembers["members"] } | null>(null);

  const today = new Date();
  const todays = challenges.filter((c) => occursOn(c, today));
  // Grupos del usuario que tienen reto hoy (en orden)
  const groupsWithToday = groups.filter((g) => todays.some((c) => c.group_id === g.id));
  if (groupsWithToday.length === 0) return null;

  const idx = Math.min(sel, groupsWithToday.length - 1);
  const activeGroup = groupsWithToday[idx];
  const isOwner = activeGroup.owner_id === userId;
  const groupChallenges = todays.filter((c) => c.group_id === activeGroup.id);

  function open(c: Challenge) {
    if (isOwner) setAttendanceFor({ challenge: c, members: activeGroup.members });
    else setDetailFor(c);
  }

  return (
    <div className="rounded-[16px] p-4 mb-3" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(239,200,139,0.4)" }}>
      {/* Header: título + nombre del grupo a la derecha */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Flag size={15} strokeWidth={1.5} className="text-warm" />
          <span className="text-[13px] font-medium">Reto grupal</span>
        </div>
        <span className="text-[11px] text-warm truncate max-w-[45%] text-right">{activeGroup.name}</span>
      </div>

      {/* Píldoras de grupos (si hay más de uno con reto hoy) */}
      {groupsWithToday.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 mb-3" style={{ scrollSnapType: "x mandatory" }}>
          <div className="w-4 flex-shrink-0" />
          {groupsWithToday.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setSel(i)}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] transition-colors"
              style={{
                scrollSnapAlign: "start",
                background: i === idx ? "var(--color-warm)" : "var(--color-surface)",
                color: i === idx ? "#1a1000" : "var(--color-muted)",
                border: i === idx ? "none" : "1px solid var(--color-border)",
                fontWeight: i === idx ? 500 : 400,
              }}
            >
              {g.name}
            </button>
          ))}
          <div className="w-4 flex-shrink-0" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {groupChallenges.map((c) => (
          <button key={c.id} onClick={() => open(c)} className="flex items-center gap-2.5 text-left w-full">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
              <Flag size={13} strokeWidth={1.5} className="text-warm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] truncate">{c.title}{c.at_time ? ` · ${c.at_time}` : ""}</p>
              {c.description && <p className="text-[11px] text-[var(--color-muted)] truncate">{c.description}</p>}
            </div>
            {isOwner
              ? <span className="flex items-center gap-1 text-[11px] text-warm flex-shrink-0"><Users size={12} strokeWidth={1.5} /> Asistencia</span>
              : <span className="text-[11px] text-warm flex-shrink-0">+{c.points} pts</span>}
          </button>
        ))}
      </div>

      <ChallengeDetailDrawer open={!!detailFor} onClose={() => setDetailFor(null)} challenge={detailFor} />
      {attendanceFor && (
        <AttendanceDrawer
          open={!!attendanceFor}
          onClose={() => setAttendanceFor(null)}
          challenge={attendanceFor.challenge}
          date={todayLocalStr()}
          members={attendanceFor.members}
        />
      )}
    </div>
  );
}
