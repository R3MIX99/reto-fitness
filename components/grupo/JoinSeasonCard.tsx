"use client";

import { useState } from "react";
import { Trophy, AlertTriangle } from "lucide-react";
import { useJoinActiveSeason } from "@/lib/hooks/useSeasons";

interface JoinSeasonCardProps {
  groupId: string;
  seasonName: string;
  hasStarted: boolean;
}

// Tarjeta para que un miembro que entró a media temporada pueda unirse a competir.
export function JoinSeasonCard({ groupId, seasonName, hasStarted }: JoinSeasonCardProps) {
  const join = useJoinActiveSeason();
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    try {
      await join.mutateAsync(groupId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo unir");
    }
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[16px] p-4 mb-3 border" style={{ borderColor: "rgba(239,200,139,0.35)" }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
          <Trophy size={15} strokeWidth={1.5} className="text-warm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">Únete a {seasonName}</p>
          <p className="text-[12px] text-[var(--color-muted)]" style={{ lineHeight: 1.5 }}>
            {hasStarted
              ? "La temporada ya empezó. Si te unes, tus puntos cuentan desde hoy: empiezas en desventaja, pero puedes competir por el título."
              : "Aún no arranca. Únete ahora y competirás desde el inicio."}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <AlertTriangle size={12} strokeWidth={1.5} className="text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-400">{error}</p>
        </div>
      )}

      <button
        onClick={handleJoin}
        disabled={join.isPending}
        className="w-full bg-warm text-accent-dark text-[13px] font-medium rounded-pill py-2.5 disabled:opacity-50"
      >
        {join.isPending ? "Uniéndote..." : "Unirme a la temporada"}
      </button>
    </div>
  );
}
