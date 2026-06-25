"use client";

import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { usePlan, useSubscriptionRealtime, useClearCelebration, TIER_LABEL } from "@/lib/hooks/usePlan";

// Vigila la suscripción en tiempo real y muestra la celebración al subir de plan.
// Montado una vez en el layout de la app.
export function PlanWatcher() {
  useSubscriptionRealtime();
  const { data: plan } = usePlan();
  const clear = useClearCelebration();
  const [show, setShow] = useState<"pro" | "elite" | null>(null);

  useEffect(() => {
    if (plan?.celebrate === "pro" || plan?.celebrate === "elite") {
      setShow(plan.celebrate);
      clear.mutate(); // limpia en el server para no repetir
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.celebrate]);

  const isElite = show === "elite";

  return (
    <Drawer open={!!show} onClose={() => setShow(null)}>
      {show && (
        <div className="px-6 pb-9 pt-3 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div
              className="absolute inset-0 rounded-full blur-2xl"
              style={{ background: isElite ? "rgba(244,114,182,0.55)" : "rgba(239,200,139,0.55)" }}
            />
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: isElite ? "linear-gradient(135deg,#F472B6,#A78BFA)" : "linear-gradient(135deg,#EFC88B,#EEE5E9)",
                boxShadow: isElite ? "0 0 32px rgba(244,114,182,0.75)" : "0 0 28px rgba(239,200,139,0.75)",
              }}
            >
              {isElite
                ? <Sparkles size={34} strokeWidth={1.5} className="text-white" />
                : <Crown size={34} strokeWidth={1.5} className="text-[#1a1000]" />}
            </div>
          </div>

          <p className="font-display font-semibold text-[22px] mb-1">
            ¡Bienvenido a {TIER_LABEL[show]}!
          </p>
          <p className="text-[13px] text-[var(--color-muted)] mb-6" style={{ lineHeight: 1.5 }}>
            {isElite
              ? "Desbloqueaste todo: hasta 20 grupos, liga entre grupos, títulos personalizados y más."
              : "Ahora puedes crear hasta 5 grupos, con retos grupales y metas personalizables."}
          </p>

          <button
            onClick={() => setShow(null)}
            className="w-full rounded-pill py-3.5 text-[14px] font-medium"
            style={{
              background: isElite ? "linear-gradient(90deg,#F472B6,#A78BFA)" : "var(--color-warm)",
              color: isElite ? "#fff" : "#1a1000",
            }}
          >
            Empezar
          </button>
        </div>
      )}
    </Drawer>
  );
}
