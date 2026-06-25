"use client";

import { Crown, Check } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";

interface UpgradeDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const PRO_FEATURES = [
  "Hasta 5 grupos",
  "Hasta 10 miembros incluidos por grupo",
  "Retos grupales y metas personalizables",
];
const ELITE_FEATURES = [
  "Hasta 20 grupos",
  "Hasta 30 miembros incluidos por grupo",
  "Liga entre grupos y títulos personalizados",
];

function PlanOption({
  name, price, color, features, highlight,
}: { name: string; price: string; color: string; features: string[]; highlight?: boolean }) {
  return (
    <div
      className="rounded-[16px] p-4 mb-2.5"
      style={{
        background: highlight ? "rgba(239,200,139,0.08)" : "var(--color-surface)",
        border: `1px solid ${highlight ? "rgba(239,200,139,0.4)" : "var(--color-border)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Crown size={15} strokeWidth={1.5} style={{ color }} />
          <span className="text-[15px] font-medium">{name}</span>
        </div>
        <span className="text-[13px] text-[var(--color-muted)]">{price}</span>
      </div>
      <div className="space-y-1.5 mb-3">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-[12px]">
            <Check size={13} strokeWidth={2} style={{ color }} className="flex-shrink-0" />
            <span className="text-[var(--color-fg)]">{f}</span>
          </div>
        ))}
      </div>
      {/* TODO Fase 8: enlazar a la landing / checkout. Por ahora placeholder. */}
      <button
        className="w-full rounded-pill py-2.5 text-[13px] font-medium"
        style={{ background: color, color: "#1a1000" }}
      >
        Elegir {name}
      </button>
    </div>
  );
}

// Drawer de upgrade: aparece cuando el usuario alcanza el límite de su plan
// (p. ej. al intentar crear un 2.º grupo en Free).
export function UpgradeDrawer({
  open, onClose,
  title = "Estás en el plan Free",
  message = "Accede al plan Pro o Elite para mejorar y crear más grupos.",
}: UpgradeDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-14 h-14 rounded-full bg-warm/15 border border-warm/30 flex items-center justify-center mb-3">
            <Crown size={26} strokeWidth={1.5} className="text-warm" />
          </div>
          <p className="font-display font-semibold text-[18px] mb-1">{title}</p>
          <p className="text-[13px] text-[var(--color-muted)]">{message}</p>
        </div>

        <PlanOption name="Pro" price="$5.99/mes" color="#CF5C36" features={PRO_FEATURES} />
        <PlanOption name="Elite" price="$12.99/mes" color="#EFC88B" features={ELITE_FEATURES} highlight />

        <p className="text-[11px] text-[var(--color-muted)] text-center mt-3">
          El pago de planes estará disponible muy pronto.
        </p>
      </div>
    </Drawer>
  );
}
