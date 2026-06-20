"use client";

import { useState } from "react";
import { ChevronDown, UserPlus, Plus, Hash, Check, LogOut, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { GroupWithMembers } from "@/lib/hooks/useGroups";
import { getInitials, useLeaveGroup } from "@/lib/hooks/useGroups";
import Image from "next/image";

// ── GrupoCard ─────────────────────────────────────────────────────────────

interface GrupoCardProps {
  group: GroupWithMembers;
  allGroups: GroupWithMembers[];
  weekNumber: number;
  closeDate: string;
  currentUserId: string;
  onInvite: () => void;
  onSwitchGroup: (id: string) => void;
  onLeft: () => void;
}

export function GrupoCard({ group, allGroups, weekNumber, closeDate, currentUserId, onInvite, onSwitchGroup, onLeft }: GrupoCardProps) {
  const [open, setOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const leaveGroup = useLeaveGroup();

  const shownMembers = group.members.slice(0, 2);
  const extra = group.members.length - 2;
  const isOwner = group.owner_id === currentUserId;

  async function handleLeave() {
    await leaveGroup.mutateAsync(group.id);
    setConfirmLeave(false);
    onLeft();
  }

  return (
    <>
      <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
        {/* Nombre + avatares */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <span className="font-display font-medium text-[18px] truncate">{group.name}</span>
            <ChevronDown
              size={16} strokeWidth={1.5}
              className="text-[var(--color-muted)] flex-shrink-0 transition-transform duration-200"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Avatar stack */}
          <div className="flex items-center flex-shrink-0">
            {shownMembers.map((m, i) => (
              <div
                key={m.user_id}
                className="w-6 h-6 rounded-full border-[1.5px] border-[var(--color-bg-card)] flex items-center justify-center text-[9px] font-medium overflow-hidden"
                style={{ marginLeft: i > 0 ? -8 : 0, zIndex: shownMembers.length - i }}
              >
                {m.avatar_url ? (
                  <Image src={m.avatar_url} alt={m.full_name ?? ""} width={24} height={24} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-accent text-accent-dark flex items-center justify-center text-[9px] font-medium">
                    {getInitials(m.full_name)}
                  </div>
                )}
              </div>
            ))}
            {extra > 0 && (
              <div
                className="w-6 h-6 rounded-full border-[1.5px] border-[var(--color-bg-card)] bg-[#2b2b2b] flex items-center justify-center text-[9px] font-medium"
                style={{ marginLeft: -8 }}
              >
                +{extra}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="mb-3 rounded-[14px] bg-[#161616] border border-[#232323] overflow-hidden">
            {allGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => { onSwitchGroup(g.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-[#1f1f1f] last:border-b-0"
              >
                <span className="flex-1 text-[14px] truncate">{g.name}</span>
                {g.id === group.id && <Check size={14} strokeWidth={2} className="text-warm flex-shrink-0" />}
              </button>
            ))}

            <div className="border-t border-[#232323]" />

            <Link
              href="/grupo/crear"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#1f1f1f]"
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Plus size={14} strokeWidth={1.5} className="text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Crear grupo</p>
                <p className="text-[11px] text-[var(--color-muted)]">Genera un código de invitación</p>
              </div>
            </Link>

            <Link
              href="/grupo/unirse"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-warm/20 flex items-center justify-center flex-shrink-0">
                <Hash size={14} strokeWidth={1.5} className="text-warm" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Unirse con código</p>
                <p className="text-[11px] text-[var(--color-muted)]">Ingresa el código de un amigo</p>
              </div>
            </Link>

            {/* Salir — separado visualmente */}
            {!isOwner && (
              <>
                <div className="border-t border-[#2a2a2a] mx-3" />
                <button
                  onClick={() => { setOpen(false); setConfirmLeave(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <LogOut size={14} strokeWidth={1.5} className="text-red-400" />
                  </div>
                  <p className="text-[13px] text-red-400">Salir del grupo</p>
                </button>
              </>
            )}
          </div>
        )}

        {/* Chips */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-[var(--color-muted)] border border-[#2a2a2a] rounded-full px-3 py-1">
            Semana {weekNumber}
          </span>
          <span className="text-[11px] text-warm border border-warm/50 rounded-full px-3 py-1">
            Cierra {closeDate}
          </span>
        </div>

        {/* Botón invitar */}
        <button
          onClick={onInvite}
          className="w-full flex items-center justify-center gap-1.5 bg-warm text-accent-dark text-[12px] font-medium rounded-[12px] py-2.5"
        >
          <UserPlus size={14} strokeWidth={1.5} />
          Invitar amigos
        </button>
      </div>

      {/* Modal confirmación — posicionado encima del navbar */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmLeave(false)} />
          {/* pb sube el modal sobre el navbar (56px altura + 16px margen + 16px holgura = 88px) */}
          <div className="relative w-full max-w-[420px] bg-[#0e0e0e] rounded-t-[24px] pb-[88px] pt-6 px-6 flex flex-col items-center text-center animate-slide-up">
            <div className="w-10 h-1 rounded-full bg-[#2a2a2a] mx-auto mb-5" />

            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <AlertTriangle size={26} strokeWidth={1.5} className="text-red-400" />
            </div>

            <p className="font-display font-semibold text-[18px] mb-1">¿Salir del grupo?</p>
            <p className="text-[13px] text-[var(--color-muted)] mb-1">Estás a punto de abandonar</p>
            <p className="text-[14px] font-medium text-warm mb-4">{group.name}</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-6">
              Tu historial de puntos se conservará pero dejarás de aparecer en el ranking.
            </p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
                className="w-full bg-red-500/80 text-white rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50"
              >
                {leaveGroup.isPending ? "Saliendo..." : "Sí, salir del grupo"}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="w-full bg-[#1a1a1a] text-[var(--color-fg)] rounded-pill py-3.5 text-[14px]"
              >
                Cancelar
          </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
