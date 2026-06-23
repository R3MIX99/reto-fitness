"use client";

import { useState } from "react";
import { Flame, ChevronDown, ChevronUp, Trophy, Crown } from "lucide-react";
import Image from "next/image";
import { getInitials } from "@/lib/hooks/useGroups";
import type { LeaderboardEntry } from "@/lib/hooks/useGroups";

const POSITION_LABELS: Record<number, string> = { 1: "1ero", 2: "2do", 3: "3ero", 4: "4to", 5: "5to" };

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  championUserId?: string | null;
  onPlayerClick?: (userId: string) => void;
}

function PlayerRow({ entry, currentUserId, championUserId, onPlayerClick }: { entry: LeaderboardEntry; currentUserId: string; championUserId?: string | null; onPlayerClick?: (userId: string) => void }) {
  const isMe = entry.user_id === currentUserId;
  const isChampion = !!championUserId && entry.user_id === championUserId;
  const label = POSITION_LABELS[entry.position] ?? `${entry.position}to`;
  const isTop = entry.position === 1;

  return (
    <div
      onClick={() => onPlayerClick?.(entry.user_id)}
      className={`flex items-center gap-2.5 py-2.5 border-b last:border-0 ${onPlayerClick ? "cursor-pointer" : ""}`}
      style={{ borderColor: "var(--color-border)" }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {entry.avatar_url ? (
          <Image src={entry.avatar_url} alt={entry.full_name ?? ""} width={26} height={26}
            className="rounded-full object-cover" style={{ width: 26, height: 26 }} />
        ) : (
          <div className="w-[26px] h-[26px] rounded-full bg-accent flex items-center justify-center text-accent-dark text-[10px] font-medium">
            {getInitials(entry.full_name)}
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <span className={`text-[13px] truncate ${isMe || isChampion ? "font-medium" : ""} ${isChampion ? "text-champion" : ""}`}>
          {entry.full_name ?? "Usuario"}
        </span>
        {isChampion && <Crown size={13} strokeWidth={1.5} className="text-warm flex-shrink-0" fill="#EFC88B" />}
        {(entry.streak_day ?? 0) >= 3 && <Flame size={13} strokeWidth={1.5} className="text-accent flex-shrink-0" fill="#CF5C36" />}
      </div>

      {/* Position chip */}
      <span
        className={`text-[11px] rounded-full px-2.5 py-0.5 border flex-shrink-0 ${isTop ? "text-warm" : "text-[var(--color-muted)]"}`}
        style={{ borderColor: isTop ? "rgba(239,200,139,0.5)" : "var(--color-border)" }}
      >
        {label}
      </span>

      {/* Points */}
      <span className="text-[13px] text-[var(--color-muted)] w-[42px] text-right flex-shrink-0">
        {entry.total_points} pts
      </span>
    </div>
  );
}

export function Leaderboard({ entries, currentUserId, championUserId, onPlayerClick }: LeaderboardProps) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={15} strokeWidth={1.5} className="text-warm" />
        <span className="text-[14px] font-medium">Tabla de jugadores</span>
      </div>

      <div className="relative">
        <div style={{ maxHeight: expanded ? "none" : 172, overflow: "hidden" }}>
          {shown.map((e) => (
            <PlayerRow key={e.user_id} entry={e} currentUserId={currentUserId} championUserId={championUserId} onPlayerClick={onPlayerClick} />
          ))}
          {/* 4th row peek when collapsed */}
          {!expanded && entries.length > 3 && (
            <PlayerRow entry={entries[3]} currentUserId={currentUserId} championUserId={championUserId} onPlayerClick={onPlayerClick} />
          )}
        </div>

        {/* Gradient + Ver todos */}
        {!expanded && entries.length > 3 && (
          <div className="absolute left-0 right-0 bottom-0 h-[54px] pointer-events-none"
            style={{ background: "linear-gradient(to top, var(--color-bg) 35%, rgba(0,0,0,0))" }} />
        )}
        {!expanded && entries.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-1.5 text-[12px] text-warm font-medium"
          >
            Ver todos <ChevronDown size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Mostrar menos */}
      {expanded && entries.length > 3 && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-[12px] text-[var(--color-muted)] font-medium py-1"
        >
          Mostrar menos <ChevronUp size={14} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
