"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Users, Plus, Eye } from "lucide-react";
import { useMyGroups, useLeaderboard, useLast7Days, usePendingAudits, useGroupMembersGlobalLeaderboard, useGroupMembersGlobalLast7Days } from "@/lib/hooks/useGroups";
import { useUser } from "@/lib/hooks/useUser";
import { GrupoCard } from "@/components/grupo/GrupoCard";
import { EvidenciasCard } from "@/components/grupo/EvidenciasCard";
import { Leaderboard } from "@/components/grupo/Leaderboard";
import { ComparativaChart } from "@/components/grupo/ComparativaChart";
import { InviteSheet } from "@/components/grupo/InviteSheet";
import { SeasonBanner } from "@/components/grupo/SeasonBanner";
import { SeasonPodium } from "@/components/grupo/SeasonPodium";
import { SeasonHistory } from "@/components/grupo/SeasonHistory";
import { PlayerCard } from "@/components/player/PlayerCard";
import { usePrefetchPlayerCards } from "@/lib/hooks/usePlayerCard";
import { useActiveSeason, useSeasonLeaderboard, useLatestFinishedSeason } from "@/lib/hooks/useSeasons";

function GrupoPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data: groups = [], isLoading } = useMyGroups();
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [showInvite, setShowInvite] = useState(false);
  const [cardUserId, setCardUserId] = useState<string | null>(null);
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
  const memberIds = (activeGroup?.members ?? []).map((m) => m.user_id);
  const { data: pending = 0 } = usePendingAudits(groupIds);

  // Temporada en curso del grupo activo
  const { data: season = null } = useActiveSeason(activeGroup?.id ?? null);
  const { data: seasonLeaderboard = [] } = useSeasonLeaderboard(season);

  // Sin temporada → puntos globales de los miembros (todos sus grupos, deduplicado por fecha)
  const { data: globalMemberLeaderboard = [] } = useGroupMembersGlobalLeaderboard(!season ? memberIds : []);
  const { data: globalMemberLast7 = [] } = useGroupMembersGlobalLast7Days(!season ? memberIds : []);
  // Última temporada finalizada (podio) — solo se muestra si no hay una en curso
  const { data: finishedSeason = null } = useLatestFinishedSeason(activeGroup?.id ?? null);

  // Gráfica global cuando no hay temporada o la temporada aún no arrancó (sin inscritos).
  // Con temporada en curso (season_members ya poblados) → datos del grupo.
  const last7Base = (season && seasonLeaderboard.length > 0) ? last7Raw : globalMemberLast7;
  const last7 = (() => {
    const members = activeGroup?.members ?? [];
    const usersInData = new Set(last7Base.map((r) => r.user_id));
    const synthetic = members
      .filter((m) => !usersInData.has(m.user_id))
      .map((m) => ({
        user_id: m.user_id,
        full_name: m.full_name,
        score_date: new Date().toISOString().split("T")[0],
        total_points: 0,
      }));
    return [...last7Base, ...synthetic];
  })();

  // Merge de scores del grupo con todos sus miembros (fallback cuando hay temporada sin inscritos)
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

  // Con temporada en curso Y ya hay inscritos → por temporada.
  // En cualquier otro caso (sin temporada o temporada aún no arrancada) → global.
  const displayLeaderboard = (season && seasonLeaderboard.length > 0)
    ? seasonLeaderboard
    : (globalMemberLeaderboard.length > 0 ? globalMemberLeaderboard : effectiveLeaderboard);
  const leaderEntry = displayLeaderboard[0];

  // Spectator: miembro del grupo pero NO inscrito en la temporada en curso
  // (se unió después de que arrancó). Sigue haciendo checks, pero no compite.
  const isSpectator =
    !!season &&
    seasonLeaderboard.length > 0 &&
    !!user &&
    !seasonLeaderboard.some((e) => e.user_id === user.id);

  // Campeón actual = ganador de la última temporada finalizada del grupo
  const championUserId = finishedSeason?.standings.find((s) => s.rank === 1)?.user_id ?? null;

  // Precarga las tarjetas de los jugadores visibles → se abren al instante
  usePrefetchPlayerCards(displayLeaderboard.map((e) => e.user_id), activeGroup?.id ?? null);

  // Nombre/foto que ya conocemos, para mostrar la tarjeta sin "?" mientras carga
  const cardPlaceholder = (() => {
    const fromLb = displayLeaderboard.find((e) => e.user_id === cardUserId);
    if (fromLb) return { full_name: fromLb.full_name, avatar_url: fromLb.avatar_url };
    const fromPodium = finishedSeason?.standings.find((s) => s.user_id === cardUserId);
    if (fromPodium) return { full_name: fromPodium.full_name, avatar_url: fromPodium.avatar_url };
    return undefined;
  })();

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
          data-tour="group-card"
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
            season={season}
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

        {/* Banner de temporada */}
        <div data-tour="season-banner">
          <SeasonBanner
            groupId={activeGroup.id}
            isOwner={activeGroup.owner_id === user?.id}
          />
        </div>

        {/* Podio de la última temporada finalizada (si no hay una en curso) */}
        {!season && finishedSeason && <SeasonPodium result={finishedSeason} onPlayerClick={setCardUserId} />}

        {/* 2) Evidencias por revisar */}
        <EvidenciasCard
          pending={pending}
          onReview={() => router.push("/auditoria")}
          onViewHistory={() => router.push("/mis-auditorias")}
        />

        {/* Aviso spectator: se unió a mitad de temporada */}
        {isSpectator && (
          <div className="bg-[var(--color-bg-card)] rounded-[16px] p-3.5 mb-3 border flex items-start gap-3" style={{ borderColor: "rgba(207,92,54,0.35)" }}>
            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(207,92,54,0.15)" }}>
              <Eye size={15} strokeWidth={1.5} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium">Temporada en curso</p>
              <p className="text-[12px] text-[var(--color-muted)]">
                Te uniste después de que arrancó. Tus checks siguen contando para tu progreso, pero competirás desde la próxima temporada.
              </p>
            </div>
          </div>
        )}

        {/* 3) Tabla de jugadores */}
        <Leaderboard entries={displayLeaderboard} currentUserId={user?.id ?? ""} championUserId={championUserId} onPlayerClick={setCardUserId} />

        {/* 4) Comparativa */}
        {last7.length > 0 && (
          <ComparativaChart data={last7} leaderUserId={leaderEntry?.user_id} />
        )}

        {/* 5) Historial de temporadas */}
        <div className="mt-3">
          <SeasonHistory groupId={activeGroup.id} />
        </div>
      </div>

      {/* Invite sheet */}
      <InviteSheet
        open={showInvite}
        inviteCode={activeGroup.invite_code}
        groupName={activeGroup.name}
        onClose={() => setShowInvite(false)}
      />

      {/* Tarjeta de jugador */}
      {cardUserId && (
        <PlayerCard
          userId={cardUserId}
          groupId={activeGroup.id}
          currentUserId={user?.id ?? ""}
          placeholder={cardPlaceholder}
          onClose={() => setCardUserId(null)}
        />
      )}
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
