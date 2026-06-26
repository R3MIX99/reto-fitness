"use client";

import { Flag, Repeat, Calendar, Clock, Zap, CalendarClock } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import {
  scheduleLabel, recurrenceLabel, nextOccurrence, formatLongDate, type Challenge,
} from "@/lib/hooks/useChallenges";

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
      <span className="flex items-center gap-2 text-[13px] text-[var(--color-muted)]">{icon}{label}</span>
      <span className="text-[13px] text-[var(--color-fg)] text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

export function ChallengeDetailDrawer({ open, onClose, challenge }: { open: boolean; onClose: () => void; challenge: Challenge | null }) {
  if (!challenge) return <Drawer open={open} onClose={onClose}><div /></Drawer>;

  const next = nextOccurrence(challenge);

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-warm/15 border border-warm/30 flex items-center justify-center mb-3">
            <Flag size={24} strokeWidth={1.5} className="text-warm" />
          </div>
          <p className="font-display font-semibold text-[19px]">{challenge.title}</p>
        </div>

        {challenge.description && (
          <div className="rounded-[12px] px-3.5 py-3 mb-4" style={{ background: "var(--color-surface)" }}>
            <p className="text-[13px] text-[var(--color-fg)]" style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
              {challenge.description}
            </p>
          </div>
        )}

        <div className="rounded-[12px] px-3.5 py-1 mb-2" style={{ background: "var(--color-surface)" }}>
          <Row icon={<Repeat size={14} strokeWidth={1.5} />} label="Frecuencia" value={recurrenceLabel(challenge)} />
          <Row icon={<Calendar size={14} strokeWidth={1.5} />} label="Días" value={scheduleLabel({ ...challenge, at_time: null })} />
          {challenge.at_time && (
            <Row icon={<Clock size={14} strokeWidth={1.5} />} label="Hora" value={challenge.at_time} />
          )}
          <Row icon={<Zap size={14} strokeWidth={1.5} />} label="Puntos" value={`+${challenge.points} pts`} />
          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
              <CalendarClock size={14} strokeWidth={1.5} /> Próxima vez
            </span>
            <span className="text-[13px] text-warm text-right max-w-[60%]">
              {next ? formatLongDate(next) : "Sin próxima fecha"}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full text-[var(--color-fg)] rounded-pill py-3.5 text-[14px] mt-3"
          style={{ background: "var(--color-surface)" }}
        >
          Cerrar
        </button>
      </div>
    </Drawer>
  );
}
