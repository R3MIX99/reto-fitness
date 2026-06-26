"use client";

import { useState } from "react";
import { Trophy, Plus, ChevronRight, Check, X } from "lucide-react";
import {
  useMyLeagues,
  usePendingLeagueInvites,
  useRespondLeagueInvite,
  type LeagueWithParticipants,
} from "@/lib/hooks/useLeague";
import { CreateLeagueDrawer } from "./CreateLeagueDrawer";
import { LeagueStandingsDrawer } from "./LeagueStandingsDrawer";

interface Props {
  groupId: string;
  isOwner: boolean;
  isElite: boolean;
}

export function LeagueSection({ groupId, isOwner, isElite }: Props) {
  const { data: leagues = [], isLoading } = useMyLeagues(groupId);
  const { data: invites = [] } = usePendingLeagueInvites(isOwner ? groupId : undefined);
  const respond = useRespondLeagueInvite();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<LeagueWithParticipants | null>(null);

  if (!isElite && leagues.length === 0 && invites.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[var(--color-warm)]" />
            <h3 className="font-display font-semibold text-sm text-[var(--color-fg)]">
              Liga entre grupos
            </h3>
          </div>
          {isOwner && isElite && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] font-display font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva liga
            </button>
          )}
        </div>

        {/* Invitaciones pendientes */}
        {invites.map((inv: any) => (
          <div
            key={inv.id}
            className="bg-[var(--color-warm)]/10 rounded-2xl px-4 py-3.5 space-y-2"
          >
            <div className="flex items-start gap-2">
              <Trophy className="w-4 h-4 text-[var(--color-warm)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
                  {inv.league?.name ?? "Liga sin nombre"}
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Invitado por <strong className="text-[var(--color-fg)]">{inv.league?.owner_group?.name ?? "otro grupo"}</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => respond.mutate({ leagueId: inv.league_id, groupId, accept: true })}
                disabled={respond.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-display font-semibold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Aceptar
              </button>
              <button
                onClick={() => respond.mutate({ leagueId: inv.league_id, groupId, accept: false })}
                disabled={respond.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 text-[var(--color-muted)] text-xs font-display font-semibold disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Rechazar
              </button>
            </div>
          </div>
        ))}

        {/* Ligas activas */}
        {isLoading ? (
          <div className="h-14 bg-white/5 rounded-2xl animate-pulse" />
        ) : leagues.length === 0 ? (
          isOwner && isElite ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-4 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-[var(--color-warm)]" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold text-sm text-[var(--color-fg)]">
                  Crear primera liga
                </p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Reta a otro grupo Elite
                </p>
              </div>
              <Plus className="w-4 h-4 text-[var(--color-muted)]" />
            </button>
          ) : null
        ) : (
          leagues.map((league) => {
            const acceptedCount = league.participants.filter((p) => p.status === "accepted").length;
            const pendingCount = league.participants.filter((p) => p.status === "pending").length;
            return (
              <button
                key={league.id}
                onClick={() => setSelectedLeague(league)}
                className="w-full flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3.5 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-[var(--color-warm)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate">
                    {league.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    {acceptedCount} grupo{acceptedCount !== 1 ? "s" : ""}
                    {pendingCount > 0 && ` · ${pendingCount} pendiente${pendingCount > 1 ? "s" : ""}`}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
              </button>
            );
          })
        )}
      </div>

      <CreateLeagueDrawer
        open={showCreate}
        onClose={() => setShowCreate(false)}
        groupId={groupId}
      />

      {selectedLeague && (
        <LeagueStandingsDrawer
          open={!!selectedLeague}
          onClose={() => setSelectedLeague(null)}
          league={selectedLeague}
          myGroupId={groupId}
        />
      )}
    </>
  );
}
