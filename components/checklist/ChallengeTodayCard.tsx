"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useGroupChallenges, occursOn, type Challenge } from "@/lib/hooks/useChallenges";
import { ChallengeDetailDrawer } from "@/components/grupo/ChallengeDetailDrawer";

// Aviso del reto grupal del día en el checklist. Solo aparece el día que toca.
// La asistencia la toma el admin desde la pantalla del grupo.
export function ChallengeTodayCard({ groupId }: { groupId: string | null }) {
  const { data: challenges = [] } = useGroupChallenges(groupId);
  const [detailFor, setDetailFor] = useState<Challenge | null>(null);
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
          <button key={c.id} onClick={() => setDetailFor(c)} className="flex items-center gap-2.5 text-left w-full">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
              <Flag size={13} strokeWidth={1.5} className="text-warm" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] truncate">{c.title}{c.at_time ? ` · ${c.at_time}` : ""}</p>
              {c.description && <p className="text-[11px] text-[var(--color-muted)] truncate">{c.description}</p>}
            </div>
            <span className="text-[11px] text-warm flex-shrink-0">+{c.points} pts</span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-[var(--color-muted)] mt-2.5">
        Toca un reto para ver los detalles. El administrador toma la asistencia.
      </p>

      <ChallengeDetailDrawer open={!!detailFor} onClose={() => setDetailFor(null)} challenge={detailFor} />
    </div>
  );
}
