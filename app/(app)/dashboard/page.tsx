// PROMPT 7 — Dashboard (placeholder)
export default function DashboardPage() {
  return (
    <div className="px-4 pb-28 pt-2 space-y-3">
      {/* Tarjeta de puntos del día */}
      <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4">
        <div className="flex justify-between items-baseline text-xs text-[var(--color-muted)] mb-1">
          <span>Puntos de hoy</span>
          <span className="text-warm">domingo cierra semana</span>
        </div>
        <div className="font-display font-medium text-[30px] mb-2">
          8<span className="text-[var(--color-muted)] text-lg"> / 11</span>
        </div>
        <div className="h-2 rounded-full bg-[#1f1f1f] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: "73%",
              background: "linear-gradient(90deg, #EFC88B, #EEE5E9)",
            }}
          />
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Llevas 2 días de racha. ¡Uno más y ganas +3 pts!
        </p>
      </div>

      {/* Mini tarjetas */}
      <div className="flex gap-3">
        <div className="flex-1 bg-[var(--color-bg-card)] rounded-[18px] p-3">
          <div className="text-xs text-[var(--color-muted)] mb-1">Racha</div>
          <div className="font-display font-medium text-[15px]">2 días</div>
        </div>
        <div className="flex-1 bg-[var(--color-bg-card)] rounded-[18px] p-3">
          <div className="text-xs text-[var(--color-muted)] mb-1">Tu rival</div>
          <div className="font-display font-medium text-[15px]">Luis · 9 pts</div>
        </div>
      </div>

      {/* Tabla de jugadores (placeholder) */}
      <div>
        <p className="text-xs text-[var(--color-muted)] mb-2">Tabla de jugadores</p>
        <p className="text-xs text-[var(--color-muted)]">
          Conecta Supabase para ver el ranking en vivo.
        </p>
      </div>
    </div>
  );
}
