"use client";

import { ChevronDown, UserPlus } from "lucide-react";
import type { GroupWithMembers } from "@/lib/hooks/useGroups";
import { getInitials } from "@/lib/hooks/useGroups";
import Image from "next/image";

interface GrupoCardProps {
  group: GroupWithMembers;
  weekNumber: number;
  closeDate: string;
  onInvite: () => void;
  onSwitchGroup?: () => void;
}

export function GrupoCard({ group, weekNumber, closeDate, onInvite, onSwitchGroup }: GrupoCardProps) {
  const shownMembers = group.members.slice(0, 2);
  const extra = group.members.length - 2;

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      {/* Nombre + avatares */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={onSwitchGroup}
          className="flex items-center gap-1.5 flex-1 min-w-0"
        >
          <span className="font-display font-medium text-[18px] truncate">{group.name}</span>
          <ChevronDown size={16} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0" />
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
  );
}
