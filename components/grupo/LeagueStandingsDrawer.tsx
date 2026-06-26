"use client";

import { Drawer } from "@/components/ui/Drawer";
import { useLeagueStandings, type LeagueWithParticipants } from "@/lib/hooks/useLeague";
import { Trophy, Users, Crown } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  league: LeagueWithParticipants;
  myGroupId: string;
}

export function LeagueStandingsDrawer({ open, onClose, league, myGroupId }: Props) {
  const { data: standings = [], isLoading } = useLeagueStandings(open ? league.id : undefined);

  const pendingCount = league.participants.filter((p) => p.status === "pending").length;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 space-y-4 pb-6">
        <h2 className="font-display font-bold text-lg text-[var(--color-fg)] truncate">{league.name}</h2>
        {/* Estado de la liga */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span>Desde {new Date(league.start_date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
          {league.end_date && (
            <>
              <span>·</span>
              <span>Hasta {new Date(league.end_date + "T12:00:00").toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}</span>
            </>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="bg-[var(--color-warm)]/10 rounded-xl px-4 py-3 text-xs text-[var(--color-warm)]">
            Esperando que {pendingCount} grupo{pendingCount > 1 ? "s" : ""} acepte la invitación…
          </div>
        )}

        {/* Standings */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : standings.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-muted)] text-sm">
            Aún no hay grupos aceptados en esta liga.
          </div>
        ) : (
          <div className="space-y-2">
            {standings.map((s, i) => {
              const isMe = s.group_id === myGroupId;
              const isFirst = s.rank === 1;
              return (
                <div
                  key={s.group_id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ${
                    isMe
                      ? "bg-[var(--color-accent)]/15 ring-1 ring-[var(--color-accent)]/30"
                      : "bg-white/5"
                  }`}
                >
                  {/* Posición */}
                  <div className="w-8 h-8 flex items-center justify-center">
                    {isFirst ? (
                      <Crown className="w-5 h-5 text-[var(--color-warm)]" />
                    ) : (
                      <span className="font-display font-bold text-sm text-[var(--color-muted)]">
                        {s.rank}
                      </span>
                    )}
                  </div>

                  {/* Info del grupo */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-display font-semibold text-sm truncate ${isMe ? "text-[var(--color-fg)]" : "text-[var(--color-fg)]"}`}>
                      {s.group_name}
                      {isMe && <span className="ml-1.5 text-[10px] text-[var(--color-accent)] font-body uppercase tracking-wider">tú</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="w-3 h-3 text-[var(--color-muted)]" />
                      <span className="text-[11px] text-[var(--color-muted)]">
                        {s.member_count} miembro{s.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Puntos */}
                  <div className="text-right">
                    <p className={`font-display font-bold text-lg ${isFirst ? "text-[var(--color-warm)]" : "text-[var(--color-fg)]"}`}>
                      {s.total_points.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-[var(--color-muted)]">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-[var(--color-muted)]">
          Se actualiza cada minuto · Suma de puntos de todos los miembros
        </p>
      </div>
    </Drawer>
  );
}
