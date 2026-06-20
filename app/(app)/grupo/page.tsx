"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { useMyGroups, useLeaderboard, useLast7Days, usePendingAudits } from "@/lib/hooks/useGroups";
import { useUser } from "@/lib/hooks/useUser";
import { GrupoCard } from "@/components/grupo/GrupoCard";
import { EvidenciasCard } from "@/components/grupo/EvidenciasCard";
import { Leaderboard } from "@/components/grupo/Leaderboard";
import { ComparativaChart } from "@/components/grupo/ComparativaChart";
import { InviteSheet } from "@/components/grupo/InviteSheet";

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function getNextSunday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + diff);
  const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${days[d.getDay()]} ${d.getDate()}`;
}

export default function GrupoPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: groups = [], isLoading } = useMyGroups();
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [showInvite, setShowInvite] = useState(false);

  // Clamp index when groups array shrinks (e.g. after leaving a group)
  useEffect(() => {
    if (groups.length > 0 && activeGroupIdx >= groups.length) {
      setActiveGroupIdx(0);
    }
  }, [groups, activeGroupIdx]);

  const activeGroup = groups[activeGroupIdx] ?? null;

  const { data: leaderboard = [] } = useLeaderboard(activeGroup?.id ?? null);
  const { data: last7 = [] } = useLast7Days(activeGroup?.id ?? null);
  const { data: pending = 0 } = usePendingAudits(activeGroup?.id ?? null);

  // Si no hay puntos en daily_scores, construir el ranking desde los miembros del grupo con 0 pts
  const effectiveLeaderboard = leaderboard.length > 0
    ? leaderboard
    : activeGroup?.members.map((m, i) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        total_points: 0,
        position: i + 1,
        is_leader: i === 0,
      })) ?? [];

  const leaderEntry = effectiveLeaderboard[0];

  // No groups state
  if (!isLoading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center">
          <Users size={26} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </div>
        <div>
          <p className="font-display font-medium text-[18px] mb-1">Sin grupo aún</p>
          <p className="text-[13px] text-[var(--color-muted)]">Crea un grupo o únete con un código de invitación.</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-[260px]">
          <Link
            href="/grupo/crear"
            className="flex items-center justify-center gap-2 bg-accent text-white rounded-pill py-3 text-[14px] font-medium"
          >
            <Plus size={16} strokeWidth={1.5} />
            Crear grupo
          </Link>
          <Link
            href="/grupo/unirse"
            className="flex items-center justify-center gap-2 bg-[var(--color-bg-card)] text-[var(--color-fg)] rounded-pill py-3 text-[14px]"
          >
            Unirse con código
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !activeGroup) {
    return (
      <div className="px-4 pt-2 pb-28 space-y-3 animate-pulse">
        <div className="h-[130px] bg-[var(--color-bg-card)] rounded-[18px]" />
        <div className="h-[110px] bg-[var(--color-bg-card)] rounded-[18px]" />
        <div className="h-[200px] bg-[var(--color-bg-card)] rounded-[18px]" />
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pb-28 pt-2">
        {/* 1) Tarjeta del grupo */}
        <GrupoCard
          group={activeGroup}
          allGroups={groups}
          weekNumber={getWeekNumber()}
          closeDate={getNextSunday()}
          currentUserId={user?.id ?? ""}
          onInvite={() => setShowInvite(true)}
          onSwitchGroup={(id) => {
            const idx = groups.findIndex((g) => g.id === id);
            if (idx !== -1) setActiveGroupIdx(idx);
          }}
          onLeft={() => setActiveGroupIdx(0)}
        />

        {/* 2) Evidencias por revisar */}
        <EvidenciasCard
          pending={pending}
          onReview={() => router.push("/auditoria")}
        />

        {/* 3) Tabla de jugadores */}
        <Leaderboard entries={effectiveLeaderboard} currentUserId={user?.id ?? ""} />

        {/* 4) Comparativa */}
        {last7.length > 0 && (
          <ComparativaChart data={last7} leaderUserId={leaderEntry?.user_id} />
        )}
      </div>

      {/* Invite sheet */}
      <InviteSheet
        open={showInvite}
        inviteCode={activeGroup.invite_code}
        groupName={activeGroup.name}
        onClose={() => setShowInvite(false)}
      />

    </>
  );
}
