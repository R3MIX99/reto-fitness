"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useOutgoingTransfer, getInitials } from "@/lib/hooks/useGroups";

// Banner para el dueño: muestra la transferencia pendiente que envió, con una
// barra de progreso y el contador de las 48 h. Desaparece al aceptarse/rechazarse
// (vía realtime) o al vencer.
export function PendingTransferBanner({ groupId }: { groupId: string }) {
  const { data: t } = useOutgoingTransfer(groupId);
  const [, setTick] = useState(0);

  // Re-render cada 30 s para mover la barra y el contador
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  if (!t) return null;

  const start = new Date(t.created_at).getTime();
  const end = new Date(t.expires_at).getTime();
  const now = Date.now();
  const total = Math.max(1, end - start);
  const elapsed = Math.min(total, Math.max(0, now - start));
  const pct = Math.round((elapsed / total) * 100);
  const msLeft = Math.max(0, end - now);
  const hLeft = Math.floor(msLeft / 3600000);
  const mLeft = Math.floor((msLeft % 3600000) / 60000);
  const leftLabel = hLeft >= 1 ? `${hLeft} h restantes` : `${Math.max(1, mLeft)} min restantes`;

  return (
    <div className="rounded-[16px] p-3.5 mb-3 border" style={{ background: "var(--color-bg-card)", borderColor: "rgba(239,200,139,0.35)" }}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-surface)" }}>
          {t.to_avatar ? (
            <Image src={t.to_avatar} alt={t.to_name ?? ""} width={32} height={32} className="object-cover w-full h-full" unoptimized={t.to_avatar.includes("?t=")} referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[11px] font-medium text-[var(--color-muted)]">{getInitials(t.to_name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">Transferencia pendiente</p>
          <p className="text-[11px] text-[var(--color-muted)] truncate">
            Esperando que <span className="text-warm">{t.to_name ?? "el miembro"}</span> acepte
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] flex-shrink-0">
          <Clock size={12} strokeWidth={1.5} /> {leftLabel}
        </span>
      </div>

      <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--color-warm)" }} />
      </div>
    </div>
  );
}
