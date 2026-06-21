import Image from "next/image";
import { Star } from "lucide-react";
import { Chip } from "./Chip";

const POSITION_LABELS: Record<number, string> = {
  1: "1ero",
  2: "2do",
  3: "3ero",
  4: "4to",
  5: "5to",
};

interface PlayerRowProps {
  position: number;
  name: string;
  points: number;
  avatarUrl?: string | null;
  isLeader?: boolean;
  isCurrentUser?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function PlayerRow({
  position,
  name,
  points,
  avatarUrl,
  isLeader,
  isCurrentUser,
}: PlayerRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--color-border)" }}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={name}
            width={36}
            height={36}
            className="rounded-full object-cover"
            style={{ width: 36, height: 36 }}
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-[12px] font-medium">
            {getInitials(name)}
          </div>
        )}
        {isLeader && (
          <Star
            size={12}
            className="absolute -top-1 -right-1 text-warm fill-warm"
          />
        )}
      </div>

      {/* Nombre */}
      <span className={`flex-1 text-[14px] ${isCurrentUser ? "font-medium" : ""}`}>
        {name}
        {isCurrentUser && <span className="text-[var(--color-muted)] text-[12px] ml-1">(tú)</span>}
      </span>

      {/* Posición + puntos */}
      <div className="flex items-center gap-2">
        <Chip variant={position === 1 ? "warm" : "muted"}>
          {POSITION_LABELS[position] ?? `${position}to`}
        </Chip>
        <span className="font-display font-semibold text-[15px] min-w-[40px] text-right">
          {points}
        </span>
      </div>
    </div>
  );
}
