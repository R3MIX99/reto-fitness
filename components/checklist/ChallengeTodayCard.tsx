"use client";

import { Flag } from "lucide-react";
import { useGroupChallenges, occursOn } from "@/lib/hooks/useChallenges";

// Aviso del reto grupal del día en el checklist. Solo aparece el día que toca.
// La asistencia la toma el admin desde la pantalla del grupo.
export function ChallengeTodayCard({ groupId }: { groupId: string | null }) {
  const { data: challenges = [] } = useGroupChallenges(groupId);
  const today = new Date();
  const todays = challenges.filter((c) => occursOn(c, today));
  if (todays.length === 0) return null;

  return (
    <div className="rounded-[16px] p-4 mb-3" style={{ background: "var(--color-bg-card)", border: "1px solid rgba(239,200,139,0.4)" }}>
      <div className="flex items-center gap-2 mb-2.5">
        <Flag size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[13px] font-medium">Reto de hoy</span>
      </div>
      <div className="flex flex-col gap-2">
        {todays.map((c) => (
          <div key={c.id} className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
              <Flag size={13} strokeWidth={1.5} className="text-warm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] truncate">{c.title}{c.at_time ? ` · ${c.at_time}` : ""}</p>
              {c.description && <p className="text-[11px] text-[var(--color-muted)] truncate">{c.description}</p>}
            </div>
            <span className="text-[11px] text-warm flex-shrink-0">+{c.points} pts</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-muted)] mt-2.5">
        El administrador toma la asistencia para asignar los puntos.
      </p>
    </div>
  );
}
