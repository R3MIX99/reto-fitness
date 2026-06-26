"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Flag, Plus, Calendar, Users, Trash2, ImageIcon } from "lucide-react";
import type { GroupMemberWithProfile } from "@/lib/hooks/useGroups";
import { usePlan } from "@/lib/hooks/usePlan";
import { UpgradeDrawer } from "@/components/ui/UpgradeDrawer";
import {
  useGroupChallenges, useChallengeMemories, useDeleteChallenge, occursOn, scheduleLabel,
  signedMemoryUrl, todayLocalStr, type Challenge, type Memory,
} from "@/lib/hooks/useChallenges";
import { CreateChallengeDrawer } from "@/components/grupo/CreateChallengeDrawer";
import { AttendanceDrawer } from "@/components/grupo/AttendanceDrawer";

function MemoryThumb({ m }: { m: Memory }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { signedMemoryUrl(m.photo_path).then(setUrl); }, [m.photo_path]);
  return (
    <div className="flex-shrink-0 w-[110px]">
      <div className="w-[110px] h-[110px] rounded-[12px] overflow-hidden flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        {url
          ? <Image src={url} alt={m.title} width={110} height={110} className="object-cover w-full h-full" unoptimized />
          : <ImageIcon size={22} strokeWidth={1} className="text-[var(--color-muted)]" />}
      </div>
      <p className="text-[10px] text-[var(--color-muted)] mt-1 truncate">{m.title}</p>
      <p className="text-[10px] text-[var(--color-muted)] truncate">{m.occurrence_date}</p>
    </div>
  );
}

export function ChallengesSection({ groupId, isOwner, members }: { groupId: string; isOwner: boolean; members: GroupMemberWithProfile[] }) {
  const { data: plan } = usePlan();
  const { data: challenges = [] } = useGroupChallenges(groupId);
  const { data: memories = [] } = useChallengeMemories(groupId);
  const del = useDeleteChallenge();

  const [createOpen, setCreateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [attendanceFor, setAttendanceFor] = useState<Challenge | null>(null);

  const canCreate = plan?.is_super_admin || plan?.tier === "pro" || plan?.tier === "elite";
  const today = new Date();
  const todayStr = todayLocalStr();

  // Para no-dueños sin retos ni recuerdos, no mostrar la sección
  if (!isOwner && challenges.length === 0 && memories.length === 0) return null;

  function handleCreate() {
    if (canCreate) setCreateOpen(true);
    else setUpgradeOpen(true);
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <Flag size={15} strokeWidth={1.5} className="text-warm" />
          <span className="text-[14px] font-medium">Retos del grupo</span>
        </div>
        {isOwner && (
          <button onClick={handleCreate} className="flex items-center gap-1 text-[12px] text-warm">
            <Plus size={14} strokeWidth={1.5} /> Crear
          </button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="rounded-[14px] p-4 text-center" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <p className="text-[12px] text-[var(--color-muted)]">
            {isOwner ? "Crea un reto grupal (ej. correr cada lunes). Solo aparece el día que toca." : "Aún no hay retos en este grupo."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {challenges.map((c) => {
            const isToday = occursOn(c, today);
            return (
              <div key={c.id} className="rounded-[14px] p-3.5"
                style={{ background: "var(--color-bg-card)", border: isToday ? "1px solid rgba(239,200,139,0.4)" : "1px solid var(--color-border)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: isToday ? "rgba(239,200,139,0.15)" : "var(--color-surface)" }}>
                    <Flag size={16} strokeWidth={1.5} className={isToday ? "text-warm" : "text-[var(--color-muted)]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium truncate">{c.title}</p>
                      {isToday && <span className="text-[10px] text-warm border border-warm/40 rounded-full px-2 py-0.5 flex-shrink-0">Hoy</span>}
                    </div>
                    {c.description && <p className="text-[12px] text-[var(--color-muted)] truncate">{c.description}</p>}
                    <p className="text-[11px] text-[var(--color-muted)] flex items-center gap-1 mt-0.5">
                      <Calendar size={11} strokeWidth={1.5} /> {scheduleLabel(c)} · +{c.points} pts
                    </p>
                  </div>
                  {isOwner && (
                    <button onClick={() => del.mutate({ challengeId: c.id, groupId })} className="flex-shrink-0 p-1">
                      <Trash2 size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                    </button>
                  )}
                </div>

                {isToday && isOwner && (
                  <button onClick={() => setAttendanceFor(c)}
                    className="w-full mt-3 flex items-center justify-center gap-1.5 bg-warm text-accent-dark text-[12px] font-medium rounded-[10px] py-2">
                    <Users size={13} strokeWidth={1.5} /> Tomar asistencia
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Recuerdos del grupo */}
      {memories.length > 0 && (
        <>
          <p className="text-[12px] text-[var(--color-muted)] mt-4 mb-2">Recuerdos</p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {memories.map((m) => <MemoryThumb key={`${m.challenge_id}-${m.occurrence_date}`} m={m} />)}
          </div>
        </>
      )}

      <CreateChallengeDrawer open={createOpen} onClose={() => setCreateOpen(false)} groupId={groupId} />
      <UpgradeDrawer open={upgradeOpen} onClose={() => setUpgradeOpen(false)}
        title="Retos grupales: Pro o Elite"
        message="Crea retos programados (correr, gym en grupo…) con asistencia y puntos. Disponible en Pro y Elite." />
      {attendanceFor && (
        <AttendanceDrawer
          open={!!attendanceFor}
          onClose={() => setAttendanceFor(null)}
          challenge={attendanceFor}
          date={todayStr}
          members={members}
        />
      )}
    </div>
  );
}
