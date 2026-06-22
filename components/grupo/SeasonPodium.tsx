"use client";

import Image from "next/image";
import { Trophy, Medal } from "lucide-react";
import type { FinishedSeasonResult, PodiumEntry } from "@/lib/hooks/useSeasons";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmt(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const TITLES: Record<number, string> = {
  1: "El más fuerte",
  2: "Subcampeón",
  3: "Tercer lugar",
};

const MEDAL_COLORS: Record<number, string> = {
  1: "#EFC88B", // oro
  2: "#C0C0C0", // plata
  3: "#CD7F32", // bronce
};

function Avatar({ entry, size }: { entry: PodiumEntry; size: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: "var(--color-surface)" }}
    >
      {entry.avatar_url ? (
        <Image src={entry.avatar_url} alt={entry.full_name ?? ""} width={size} height={size} className="object-cover" unoptimized />
      ) : (
        <span className="font-medium text-[var(--color-muted)]" style={{ fontSize: size * 0.34 }}>
          {getInitials(entry.full_name)}
        </span>
      )}
    </div>
  );
}

export function SeasonPodium({ result }: { result: FinishedSeasonResult }) {
  const { season, standings } = result;
  const top3 = standings.filter((s) => s.rank <= 3);
  const first = top3.find((s) => s.rank === 1);
  const second = top3.find((s) => s.rank === 2);
  const third = top3.find((s) => s.rank === 3);
  const rest = standings.filter((s) => s.rank > 3);

  // Orden visual del podio: 2° · 1° · 3°
  const podiumOrder = [second, first, third];
  const heights = [78, 104, 62];
  const avatarSizes = [46, 58, 42];

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3 border" style={{ borderColor: "rgba(239,200,139,0.35)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={16} strokeWidth={1.5} className="text-warm" />
        <p className="text-[14px] font-medium">Temporada finalizada</p>
      </div>
      <p className="text-[12px] text-[var(--color-muted)] mb-4">
        {season.name} · {fmt(season.start_date)} – {fmt(season.end_date)}
      </p>

      {/* Podio */}
      <div className="flex items-end justify-center gap-2.5 mb-2">
        {podiumOrder.map((entry, i) => {
          if (!entry) return <div key={i} className="flex-1 max-w-[96px]" />;
          const rank = entry.rank;
          return (
            <div key={entry.user_id} className="flex-1 max-w-[96px] flex flex-col items-center">
              <div className="relative mb-1.5">
                <Avatar entry={entry} size={avatarSizes[i]} />
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: MEDAL_COLORS[rank], color: "#000" }}
                >
                  {rank}
                </div>
              </div>
              <p className="text-[12px] font-medium text-center leading-tight truncate w-full">
                {entry.full_name ?? "Jugador"}
              </p>
              <p className="text-[10px] text-center mb-1.5" style={{ color: MEDAL_COLORS[rank] }}>
                {TITLES[rank]}
              </p>
              <div
                className="w-full rounded-t-[10px] flex items-start justify-center pt-1.5"
                style={{ height: heights[i], background: `${MEDAL_COLORS[rank]}22`, borderTop: `2px solid ${MEDAL_COLORS[rank]}` }}
              >
                <span className="text-[13px] font-display font-semibold" style={{ color: MEDAL_COLORS[rank] }}>
                  {entry.total_points}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resto de la tabla */}
      {rest.length > 0 && (
        <div className="mt-3 divide-border">
          {rest.map((entry) => (
            <div key={entry.user_id} className="flex items-center gap-3 py-2">
              <span className="text-[12px] text-[var(--color-muted)] w-5 text-center flex-shrink-0">{entry.rank}</span>
              <Avatar entry={entry} size={28} />
              <span className="text-[13px] flex-1 truncate">{entry.full_name ?? "Jugador"}</span>
              <span className="text-[12px] text-[var(--color-muted)]">{entry.total_points} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
