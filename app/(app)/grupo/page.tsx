"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function GrupoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data: groups = [], isLoading } = useMyGroups();
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const initializedRef = useRef(false);
  const swipeRef = useRef<{ startY: number; startX: number } | null>(null);

  // On first load: if ?joined=ID, go to that group; else default to the owned group
  useEffect(() => {
    if (!initializedRef.current && groups.length > 0 && user) {
      initializedRef.current = true;
      const joinedId = searchParams.get("joined");
      if (joinedId) {
        const idx = groups.findIndex((g) => g.id === joinedId);
        if (idx !== -1) { setActiveGroupIdx(idx); return; }
      }
      const ownedIdx = groups.findIndex((g) => g.owner_id === user.id);
      if (ownedIdx !== -1) setActiveGroupIdx(ownedIdx);
    }
  }, [groups, user, searchParams]);

  // Clamp index when groups array shrinks (e.g. after leaving a group)
  useEffect(() => {
    if (groups.length > 0 && activeGroupIdx >= groups.length) {
      setActiveGroupIdx(0);
    }
  }, [groups, activeGroupIdx]);

  const activeGroup = groups[activeGroupIdx] ?? null;

  const { data: leaderboard = [] } = useLeaderboard(activeGroup?.id ?? null);
  const { data: last7Raw = [] } = useLast7Days(activeGroup?.id ?? null);
  const groupIds = groups.map((g) => g.id);
  const { data: pending = 0 } = usePendingAudits(groupIds);

  // Ensure all members appear in the chart even with 0 scores
  const last7 = (() => {
    const members = activeGroup?.members ?? [];
    const usersInData = new Set(last7Raw.map((r) => r.user_id));
    const synthetic = members
      .filter((m) => !usersInData.has(m.user_id))
      .map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        score_date: new Date().toISOString().split("T")[0],
        total_points: 0,
      }));
    return [...last7Raw, ...synthetic];
  })();

  // Merge real scores with all group members so everyone always appears
  const effectiveLeaderboard = (() => {
    const members = activeGroup?.members ?? [];
    const scoreMap = Object.fromEntries(leaderboard.map((e) => [e.user_id, e.total_points]));
    const avatarMap = Object.fromEntries(leaderboard.map((e) => [e.user_id, { full_name: e.full_name, avatar_url: e.avatar_url }]));
    return members
      .map((m) => ({
        user_id: m.user_id,
        full_name: avatarMap[m.user_id]?.full_name ?? m.full_name,
        avatar_url: avatarMap[m.user_id]?.avatar_url ?? m.avatar_url,
        total_points: scoreMap[m.user_id] ?? 0,
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .map((e, i) => ({ ...e, position: i + 1, is_leader: i === 0 }));
  })();

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

  function handleTouchStart(e: React.TouchEvent) {
    if (groups.length < 2) return;
    swipeRef.current = { startY: e.touches[0].clientY, startX: e.touches[0].clientX };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!swipeRef.current || groups.length < 2) return;
    const deltaX = swipeRef.current.startX - e.changedTouches[0].clientX;
    const deltaY = Math.abs(swipeRef.current.startY - e.changedTouches[0].clientY);
    swipeRef.current = null;
    // Only horizontal swipes (more horizontal than vertical, min 40px)
    if (Math.abs(deltaX) < 40 || deltaY > Math.abs(deltaX)) return;
    const dir = deltaX < 0 ? "right" : "left";
    setSlideDir(dir);
    setTimeout(() => {
      setActiveGroupIdx((i) =>
        dir === "left" ? (i + 1) % groups.length : (i - 1 + groups.length) % groups.length
      );
      setSlideDir(null);
    }, 220);
  }

  return (
    <>
      <div className="px-4 pb-28 pt-2">
        {/* 1) Tarjeta del grupo */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: slideDir === "left"
              ? "translateX(-60px)"
              : slideDir === "right"
              ? "translateX(60px)"
              : "translateX(0)",
            opacity: slideDir ? 0 : 1,
            transition: slideDir
              ? "transform 0.22s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease"
              : "transform 0.28s cubic-bezier(0.34,1.2,0.64,1), opacity 0.2s ease",
          }}
        >
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
        </div>

        {/* Indicador de grupos (puntitos) */}
        {groups.length > 1 && (
          <div className="flex justify-center gap-1.5 -mt-1 mb-2">
            {groups.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const dir = i > activeGroupIdx ? "left" : "right";
                  setSlideDir(dir);
                  setTimeout(() => { setActiveGroupIdx(i); setSlideDir(null); }, 220);
                }}
                className="rounded-full transition-all"
                style={{
                  width: i === activeGroupIdx ? 16 : 6,
                  height: 6,
                  background: i === activeGroupIdx ? "var(--color-warm)" : "var(--color-border)",
                }}
              />
            ))}
          </div>
        )}

        {/* 2) Evidencias por revisar */}
        <EvidenciasCard
          pending={pending}
          onReview={() => router.push("/auditoria")}
          onViewHistory={() => router.push("/mis-auditorias")}
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

export default function GrupoPage() {
  return (
    <Suspense>
      <GrupoPageInner />
    </Suspense>
  );
}
