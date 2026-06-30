"use client";

import { useState } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Crown, Check, Minus, Plus, X, Sparkles } from "lucide-react";
import { useStartCheckout } from "@/lib/hooks/usePlan";

type PaidTier = "pro" | "elite";
type Interval = "month" | "year";

// Precios MXN (deben coincidir con los productos creados en Stripe).
const PRICING: Record<PaidTier, {
  month: number; year: number; seatMonth: number; seatYear: number;
  included: number; groups: number; perks: string[];
}> = {
  pro: {
    month: 99, year: 990, seatMonth: 19, seatYear: 190, included: 10, groups: 5,
    perks: ["5 grupos propios", "10 miembros por grupo", "Retos grupales", "Metas con módulos"],
  },
  elite: {
    month: 199, year: 1990, seatMonth: 15, seatYear: 150, included: 30, groups: 20,
    perks: ["20 grupos propios", "30 miembros por grupo", "Liga entre grupos", "Títulos personalizados", "Recuerdos del Wrapped"],
  },
};

function money(n: number) {
  return `$${n.toLocaleString("es-MX")}`;
}

export function UpgradeDrawer({
  open,
  onClose,
  defaultTier = "pro",
}: {
  open: boolean;
  onClose: () => void;
  defaultTier?: PaidTier;
}) {
  const [tier, setTier] = useState<PaidTier>(defaultTier);
  const [interval, setInterval] = useState<Interval>("month");
  const [seats, setSeats] = useState(0);
  const checkout = useStartCheckout();
  const [error, setError] = useState<string | null>(null);

  const p = PRICING[tier];
  const base = interval === "month" ? p.month : p.year;
  const seatUnit = interval === "month" ? p.seatMonth : p.seatYear;
  const total = base + seats * seatUnit;
  const per = interval === "month" ? "/mes" : "/año";

  async function go() {
    setError(null);
    try {
      await checkout.mutateAsync({ tier, interval, seats });
      // redirige a Stripe; no hace falta cerrar
    } catch (e) {
      setError((e as Error).message || "No se pudo iniciar el pago.");
    }
  }

  return (
    <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[100]" style={{ background: "var(--color-overlay)" }} />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-[26px] outline-none flex flex-col max-h-[92dvh]" style={{ background: "var(--color-bg-card)" }}>
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="px-5 pb-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold text-[19px]">Mejora tu plan</p>
              <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
                <X size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
              </button>
            </div>

            {/* Selector de tier */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {(["pro", "elite"] as PaidTier[]).map((t) => {
                const active = tier === t;
                const color = t === "elite" ? "#EFC88B" : "#CF5C36";
                return (
                  <button
                    key={t}
                    onClick={() => setTier(t)}
                    className="rounded-[16px] p-3.5 text-left transition-all"
                    style={{
                      background: active ? `${color}14` : "var(--color-surface)",
                      border: `1.5px solid ${active ? color : "var(--color-border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {t === "elite" ? <Sparkles size={14} strokeWidth={1.5} style={{ color }} /> : <Crown size={14} strokeWidth={1.5} style={{ color }} />}
                      <span className="text-[14px] font-medium">{t === "elite" ? "Elite" : "Pro"}</span>
                    </div>
                    <p className="text-[13px] font-display font-semibold">{money(PRICING[t].month)}<span className="text-[11px] text-[var(--color-muted)] font-body font-normal">/mes</span></p>
                  </button>
                );
              })}
            </div>

            {/* Toggle mensual/anual */}
            <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "var(--color-surface)" }}>
              {(["month", "year"] as Interval[]).map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className="flex-1 text-[12px] font-medium rounded-full py-2 transition-colors"
                  style={{
                    background: interval === iv ? "var(--color-fg)" : "transparent",
                    color: interval === iv ? "var(--color-bg)" : "var(--color-muted)",
                  }}
                >
                  {iv === "month" ? "Mensual" : "Anual · 2 meses gratis"}
                </button>
              ))}
            </div>

            {/* Perks */}
            <div className="rounded-[14px] px-4 py-3 mb-4 space-y-2" style={{ background: "var(--color-surface)" }}>
              {p.perks.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-[13px]">
                  <Check size={14} strokeWidth={2} style={{ color: tier === "elite" ? "#EFC88B" : "#CF5C36" }} />
                  {perk}
                </div>
              ))}
            </div>

            {/* Miembros extra */}
            <div className="flex items-center justify-between rounded-[14px] px-4 py-3 mb-4" style={{ background: "var(--color-surface)" }}>
              <div className="min-w-0">
                <p className="text-[13px]">Miembros extra</p>
                <p className="text-[11px] text-[var(--color-muted)]">{money(seatUnit)}{per} cada uno</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setSeats((s) => Math.max(0, s - 1))} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "1px solid var(--color-border)" }} disabled={seats === 0}>
                  <Minus size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                </button>
                <span className="text-[15px] font-medium w-5 text-center tabular-nums">{seats}</span>
                <button onClick={() => setSeats((s) => s + 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "1px solid var(--color-border)" }}>
                  <Plus size={14} strokeWidth={1.5} className="text-[var(--color-fg)]" />
                </button>
              </div>
            </div>

            {/* Total + CTA */}
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-[13px] text-[var(--color-muted)]">Total</span>
              <span className="font-display font-semibold text-[20px]">{money(total)}<span className="text-[12px] text-[var(--color-muted)] font-body font-normal">{per}</span></span>
            </div>

            {error && <p className="text-[12px] text-accent mb-2 text-center">{error}</p>}

            <button
              onClick={go}
              disabled={checkout.isPending}
              className="w-full flex items-center justify-center gap-2 rounded-pill py-3.5 text-[14px] font-semibold disabled:opacity-50"
              style={{ background: "var(--color-fg)", color: "var(--color-bg)" }}
            >
              {checkout.isPending ? "Redirigiendo…" : "Continuar al pago"}
            </button>
            <p className="text-[11px] text-[var(--color-muted)] text-center mt-2.5">
              Pago seguro con Stripe · cancela cuando quieras
            </p>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}
