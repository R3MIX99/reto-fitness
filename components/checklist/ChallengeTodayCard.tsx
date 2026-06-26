"use client";

import { useState } from "react";
import { Flag, Users } from "lucide-react";
import type { GroupWithMembers } from "@/lib/hooks/useGroups";
import { useChallengesForGroups, occursOn, todayLocalStr, type Challenge } from "@/lib/hooks/useChallenges";
import { ChallengeDetailDrawer } from "@/components/grupo/ChallengeDetailDrawer";
import { AttendanceDrawer } from "@/components/grupo/AttendanceDrawer";

// Reto grupal del día en el checklist (arriba del ejercicio). Solo el día que toca.
// Considera TODOS los grupos del usuario. Admin del grupo del reto: abre
// asistencia. Miembro: abre detalles.
export function ChallengeTodayCard({ groups, userId }: { groups: GroupWithMembers[]; userId: string | undefined }) {
  const groupIds = groups.map((g) => g.id);
  const { data: challenges = [] } = useChallengesForGroups(groupIds);
  const [detailFor, setDetailFor] = useState<Challenge | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<{ challenge: Challenge; members: GroupWithMembers["members"] } | null>(null);

  const groupById = new Map(groups.map((g) => [g.id, g]));
  const today = new Date();
  const todays = challenges.filter((c) => occursOn(c, today));
  if (todays.length === 0) return null;

  function open(c: Challenge) {
    const g = groupById.get(c.group_id);
    const isOwner = !!g && g.owner_id === userId;
    if (isOwner && g) setAttendanceFor({ challenge: c, members: g.members });
    else setDetailFor(c);
  }

  return (
    <div className="rounded-[16px] p-4 mb-3" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(239,200,139,0.4)" }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Flag size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[13px] font-medium">Reto de hoy</span>
      </div>
      <div className="flex flex-col gap-2">
        {todays.map((c) => {
          const g = groupById.get(c.group_id);
          const isOwner = !!g && g.owner_id === userId;
          return (
            <button key={c.id} onClick={() => open(c)} className="flex items-center gap-2.5 text-left w-full">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
                <Flag size={13} strokeWidth={1.5} className="text-warm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{c.title}{c.at_time ? ` · ${c.at_time}` : ""}</p>
                <p className="text-[11px] text-[var(--color-muted)] truncate">{g?.name ?? ""}{c.description ? ` · ${c.description}` : ""}</p>
              </div>
              {isOwner
                ? <span className="flex items-center gap-1 text-[11px] text-warm flex-shrink-0"><Users size={12} strokeWidth={1.5} /> Asistencia</span>
                : <span className="text-[11px] text-warm flex-shrink-0">+{c.points} pts</span>}
            </button>
          );
        })}
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
