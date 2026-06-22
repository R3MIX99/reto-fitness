"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy, X, Calendar, Check, Crown, Sparkles } from "lucide-react";
import { usePlayerCard, useEquipTitle, type PlayerTier, type PlayerWin } from "@/lib/hooks/usePlayerCard";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmt(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr.length <= 10 ? dateStr + "T12:00:00" : dateStr);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const RING: Record<PlayerTier, string> = {
  none: "var(--color-border)",
  champion: "#EFC88B",
  legend: "#F472B6",
};

export function PlayerCard({
  userId,
  groupId,
  currentUserId,
  onClose,
}: {
  userId: string;
  groupId: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = usePlayerCard(userId, groupId);
  const equip = useEquipTitle();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  const isOwn = userId === currentUserId;
  const tier: PlayerTier = data?.tier ?? "none";
  const ringColor = RING[tier];
  const legend = tier === "legend";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-6"
      style={{ background: "rgba(0,0,0,0.8)", opacity: visible ? 1 : 0, transition: "opacity 0.2s ease" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-[340px] rounded-[24px] overflow-hidden shine-overlay ${visible ? "animate-card-pop" : "opacity-0"} ${
          data?.is_latest_champion ? "glow-gold" : ""
        }`}
        style={{
          background: "var(--color-bg-card)",
          border: `1.5px solid ${data?.is_latest_champion ? "#EFC88B" : "var(--color-border)"}`,
        }}
      >
        {/* Cerrar */}
        <button
          onClick={close}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-surface)" }}
        >
          <X size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </button>

        {/* Banda superior (color según nivel) */}
        <div
          className="h-[88px] w-full"
          style={{
            background: legend
              ? "linear-gradient(135deg, rgba(244,114,182,0.35), rgba(167,139,250,0.25))"
              : tier === "champion"
              ? "linear-gradient(135deg, rgba(239,200,139,0.35), rgba(207,92,54,0.18))"
              : "linear-gradient(135deg, var(--color-surface), var(--color-bg-card2))",
          }}
        />

        <div className="px-5 pb-5 -mt-12">
          {/* Foto */}
          <div className="flex justify-center mb-3">
            <div
              className="rounded-full p-[3px]"
              style={{ background: ringColor, boxShadow: legend ? "0 0 18px rgba(244,114,182,0.6)" : tier === "champion" ? "0 0 14px rgba(239,200,139,0.5)" : "none" }}
            >
              <div className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--color-surface)", border: "3px solid var(--color-bg-card)" }}>
                {data?.avatar_url ? (
                  <Image src={data.avatar_url} alt={data.full_name ?? ""} width={84} height={84} className="object-cover w-full h-full" unoptimized />
                ) : (
                  <span className="text-[26px] font-display font-semibold text-[var(--color-muted)]">{getInitials(data?.full_name ?? null)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <p className="text-center font-display font-semibold text-[19px] mb-1.5">
            {isLoading ? "…" : data?.full_name ?? "Jugador"}
          </p>

          {/* Título equipado */}
          <div className="flex justify-center mb-4">
            {data?.equipped ? (
              <span
                className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1 ${legend ? "glow-pink" : ""}`}
                style={{
                  color: legend ? "#fff" : "#1a0f08",
                  background: legend ? "linear-gradient(90deg,#F472B6,#A78BFA)" : "#EFC88B",
                }}
              >
                {legend ? <Sparkles size={12} strokeWidth={2} /> : <Crown size={12} strokeWidth={2} />}
                {data.equipped.title}
              </span>
            ) : (
              <span className="text-[12px] text-[var(--color-muted)] rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>
                Retador
              </span>
            )}
          </div>

          {/* Datos */}
          <div className="flex items-center justify-center gap-4 text-[12px] text-[var(--color-muted)] mb-4">
            <span className="flex items-center gap-1.5">
              <Trophy size={13} strokeWidth={1.5} className="text-warm" />
              {data?.wins_count ?? 0} {(data?.wins_count ?? 0) === 1 ? "título" : "títulos"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={13} strokeWidth={1.5} />
              Se unió {fmt(data?.joined_at ?? null)}
            </span>
          </div>

          {/* Logros */}
          {data && data.wins.length > 0 ? (
            <div>
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-2">
                {isOwn ? "Toca un título para equiparlo" : "Logros en este grupo"}
              </p>
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto no-scrollbar">
                {data.wins.map((w: PlayerWin) => {
                  const isEquipped = data.equipped?.season_id === w.season_id;
                  return (
                    <button
                      key={w.season_id}
                      disabled={!isOwn || equip.isPending}
                      onClick={() => isOwn && equip.mutate(w.season_id)}
                      className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left disabled:cursor-default"
                      style={{
                        background: isEquipped ? "rgba(239,200,139,0.12)" : "var(--color-surface)",
                        border: `1px solid ${isEquipped ? "rgba(239,200,139,0.4)" : "var(--color-border)"}`,
                      }}
                    >
                      <Trophy size={14} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{w.title}</p>
                        <p className="text-[11px] text-[var(--color-muted)]">{w.season_name} · {fmt(w.end_date)}</p>
                      </div>
                      {isEquipped && <Check size={15} strokeWidth={2} className="text-warm flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            !isLoading && (
              <p className="text-center text-[12px] text-[var(--color-muted)] py-2">
                Aún sin títulos en este grupo. ¡La próxima temporada puede ser la suya!
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
