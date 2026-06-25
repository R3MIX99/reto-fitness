"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Trophy, X, Calendar, Check, Crown, Sparkles, Medal } from "lucide-react";
import { usePlayerCard, useEquipTitle, type PlayerWin } from "@/lib/hooks/usePlayerCard";

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

const MEDAL: Record<number, string> = { 1: "#EFC88B", 2: "#C0C0C0", 3: "#CD7F32" };

export function PlayerCard({
  userId,
  groupId,
  currentUserId,
  placeholder,
  onClose,
}: {
  userId: string;
  groupId: string;
  currentUserId: string;
  placeholder?: { full_name: string | null; avatar_url: string | null };
  onClose: () => void;
}) {
  const { data, isLoading } = usePlayerCard(userId, groupId, placeholder);
  const equip = useEquipTitle();
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 200);
  }

  function equipTitle(seasonId: string) {
    equip.mutate(seasonId, {
      onSuccess: () => {
        setToast(true);
        setTimeout(() => setToast(false), 1800);
      },
    });
  }

  const isOwn = userId === currentUserId;
  // El estilo (aro/chip/glow) refleja el TÍTULO EQUIPADO, no el rango global:
  // rosa solo si muestra un campeonato siendo legendario; si equipa otro título,
  // el aro vuelve a su color de medalla (o normal si no tiene título).
  const equippedRank = data?.equipped?.rank ?? 0;
  // Rosa SOLO si el título equipado es precisamente el que desbloqueó el nivel legendario
  const legend = data?.equipped?.is_legend_unlock === true;
  const ringColor = data?.equipped
    ? (legend ? "#F472B6" : MEDAL[equippedRank] ?? "#EFC88B")
    : "var(--color-border)";

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

        {/* Banda superior (color según el título equipado) */}
        <div
          className="h-[88px] w-full"
          style={{
            background: legend
              ? "linear-gradient(135deg, rgba(244,114,182,0.35), rgba(167,139,250,0.25))"
              : equippedRank
              ? `linear-gradient(135deg, ${MEDAL[equippedRank]}55, ${MEDAL[equippedRank]}18)`
              : "linear-gradient(135deg, var(--color-surface), var(--color-bg-card2))",
          }}
        />

        <div className="px-5 pb-5 -mt-12">
          {/* Foto */}
          <div className="flex justify-center mb-3">
            <div
              className="rounded-full p-[3px]"
              style={{ background: ringColor, boxShadow: legend ? "0 0 18px rgba(244,114,182,0.6)" : equippedRank === 1 ? "0 0 14px rgba(239,200,139,0.5)" : "none" }}
            >
              <div className="w-[84px] h-[84px] rounded-full overflow-hidden flex items-center justify-center" style={{ background: "var(--color-surface)", border: "3px solid var(--color-bg-card)" }}>
                {data?.avatar_url ? (
                  <Image src={data.avatar_url} alt={data.full_name ?? ""} width={84} height={84} className="object-cover w-full h-full" unoptimized referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[26px] font-display font-semibold text-[var(--color-muted)]">{getInitials(data?.full_name ?? null)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <p className="text-center font-display font-semibold text-[19px] mb-1.5">
            {isLoading ? "…" : data?.full_name ?? "Jugador"}
            {isOwn && <span className="text-[13px] text-[var(--color-muted)] font-body font-normal"> (tú)</span>}
          </p>

          {/* Título equipado */}
          <div className="flex justify-center mb-4">
            {data?.equipped ? (() => {
              const r = data.equipped.rank;
              const bg = legend ? "linear-gradient(90deg,#F472B6,#A78BFA)" : MEDAL[r] ?? "#EFC88B";
              const fg = legend ? "#fff" : r === 3 ? "#fff" : "#1a0f08";
              const Icon = legend ? Sparkles : r === 1 ? Crown : Medal;
              return (
                <span
                  className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1 ${legend ? "glow-pink" : ""}`}
                  style={{ color: fg, background: bg }}
                >
                  <Icon size={12} strokeWidth={2} />
                  {data.equipped.title}
                </span>
              );
            })() : (
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
              <div className="flex flex-col gap-1.5">
                {data.wins.slice(0, 3).map((w: PlayerWin) => {
                  const isEquipped = data.equipped?.season_id === w.season_id;
                  return (
                    <button
                      key={w.season_id}
                      disabled={!isOwn || equip.isPending}
                      onClick={() => isOwn && equipTitle(w.season_id)}
                      className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left disabled:cursor-default"
                      style={{
                        background: isEquipped
                          ? (w.is_legend_unlock ? "rgba(244,114,182,0.1)" : "rgba(239,200,139,0.12)")
                          : "var(--color-surface)",
                        border: `1px solid ${
                          w.is_legend_unlock
                            ? isEquipped ? "rgba(244,114,182,0.6)" : "rgba(244,114,182,0.4)"
                            : isEquipped ? "rgba(239,200,139,0.4)" : "var(--color-border)"
                        }`,
                        boxShadow: w.is_legend_unlock ? "0 0 8px rgba(244,114,182,0.2)" : undefined,
                      }}
                    >
                      <Trophy size={14} strokeWidth={1.5} className="flex-shrink-0" style={{ color: w.is_legend_unlock ? "#F472B6" : (MEDAL[w.rank] ?? "var(--color-warm)") }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{w.title}</p>
                        <p className="text-[11px]" style={{ color: w.is_legend_unlock ? "#F472B6" : "var(--color-muted)" }}>{w.season_name} · {fmt(w.end_date)}</p>
                      </div>
                      {isEquipped && <Check size={15} strokeWidth={2} className="flex-shrink-0" style={{ color: w.is_legend_unlock ? "#F472B6" : "var(--color-warm)" }} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            !isLoading && (
              <p className="text-center text-[12px] text-[var(--color-muted)] py-2">
                {isOwn
                  ? "Aún no tienes títulos en este grupo. ¡Gana la temporada para conseguir el tuyo!"
                  : "Aún sin títulos en este grupo. ¡La próxima temporada puede ser la suya!"}
              </p>
            )
          )}
        </div>

        {/* Toast dentro de la tarjeta */}
        {toast && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full px-3.5 py-2 shadow-xl whitespace-nowrap" style={{ background: "#14532d", border: "1px solid rgba(34,197,94,0.5)" }}>
            <Check size={13} strokeWidth={2} style={{ color: "#22c55e" }} />
            <span className="text-[12px] text-[var(--color-fg)]">Título cambiado</span>
          </div>
        )}
      </div>
    </div>
  );
}
