"use client";

import { useState } from "react";
import { Flag, Users } from "lucide-react";
import type { GroupMemberWithProfile } from "@/lib/hooks/useGroups";
import { useGroupChallenges, occursOn, todayLocalStr, type Challenge } from "@/lib/hooks/useChallenges";
import { ChallengeDetailDrawer } from "@/components/grupo/ChallengeDetailDrawer";
import { AttendanceDrawer } from "@/components/grupo/AttendanceDrawer";

// Reto grupal del día en el checklist (arriba del ejercicio). Solo el día que toca.
// Admin: abre el drawer de asistencia. Miembro: abre los detalles.
export function ChallengeTodayCard({ groupId, isOwner, members }: { groupId: string | null; isOwner: boolean; members: GroupMemberWithProfile[] }) {
  const { data: challenges = [] } = useGroupChallenges(groupId);
  const [detailFor, setDetailFor] = useState<Challenge | null>(null);
  const [attendanceFor, setAttendanceFor] = useState<Challenge | null>(null);
  const today = new Date();
  const todays = challenges.filter((c) => occursOn(c, today));
  if (todays.length === 0) return null;

  function open(c: Challenge) {
    if (isOwner) setAttendanceFor(c);
    else setDetailFor(c);
  }

  return (
    <div className="rounded-[16px] p-4 mb-3" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(239,200,139,0.4)" }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Flag size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[13px] font-medium">Reto de hoy</span>
      </div>
      <div className="flex flex-col gap-2">
        {todays.map((c) => (
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
      <p className="text-[11px] text-[var(--color-muted)] mt-2.5">
        {isOwner ? "Toca un reto para tomar asistencia y subir la foto." : "Toca un reto para ver los detalles. El administrador toma la asistencia."}
      </p>

      <ChallengeDetailDrawer open={!!detailFor} onClose={() => setDetailFor(null)} challenge={detailFor} />
      {attendanceFor && (
        <AttendanceDrawer
          open={!!attendanceFor}
          onClose={() => setAttendanceFor(null)}
          challenge={attendanceFor}
          date={todayLocalStr()}
          members={members}
        />
      )}
    </div>
  );
}
