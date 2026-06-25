"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { usePlan, TIER_LABEL } from "@/lib/hooks/usePlan";

// Aviso cuando el plan bajó y el dueño tiene más grupos de los permitidos.
// Cuenta las 48 h restantes; al vencer, el cron borra los grupos más nuevos.
export function PlanGraceBanner() {
  const { data: plan } = usePlan();
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  if (!plan || !plan.over_limit_until) return null;

  const msLeft = Math.max(0, new Date(plan.over_limit_until).getTime() - Date.now());
  const hLeft = Math.floor(msLeft / 3600000);
  const mLeft = Math.floor((msLeft % 3600000) / 60000);
  const left = hLeft >= 1 ? `${hLeft} h` : `${Math.max(1, mLeft)} min`;
  const excess = Math.max(1, plan.owned_groups - plan.max_groups);

  return (
    <div className="rounded-[16px] p-3.5 mb-3 border" style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.35)" }}>
      <div className="flex items-start gap-2.5 mb-2">
        <AlertTriangle size={16} strokeWidth={1.5} className="text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium">Tienes grupos de más para tu plan {TIER_LABEL[plan.tier]}</p>
          <p className="text-[12px] text-[var(--color-muted)]" style={{ lineHeight: 1.5 }}>
            Tu plan permite {plan.max_groups} grupo(s) y tienes {plan.owned_groups}.
            Borra o transfiere {excess} grupo(s); si no, se eliminarán los más nuevos automáticamente.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-red-400">
        <Clock size={12} strokeWidth={1.5} /> Quedan {left}
      </div>
    </div>
  );
}
