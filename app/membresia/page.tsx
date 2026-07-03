"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Crown, Sparkles, Check, Minus, Plus, Settings, ChevronLeft, ShieldCheck,
} from "lucide-react";
import { PRICING, money, type PaidTier, type Interval } from "@/lib/stripe/plans-display";
import { usePlan, TIER_LABEL, useStartCheckout, useOpenPortal } from "@/lib/hooks/usePlan";
import { useUser } from "@/lib/hooks/useUser";
import { useIsNativeApp } from "@/lib/platform";

function TopBar() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <Link
        href="/"
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        aria-label="Volver"
      >
        <ChevronLeft size={18} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </Link>
      <div className="flex items-center gap-2">
        <Image src="/icons/logo.png" alt="Olympo" width={22} height={22} />
        <span className="font-display font-semibold text-[15px]">Membresía</span>
      </div>
    </div>
  );
}

function MembresiaInner() {
  const params = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const { data: plan } = usePlan();
  const native = useIsNativeApp();
  const qc = useQueryClient();
  const checkout = useStartCheckout();
  const portal = useOpenPortal();

  const [tier, setTier] = useState<PaidTier>(params.get("tier") === "elite" ? "elite" : "pro");
  const [interval, setInterval] = useState<Interval>("month");
  const [seats, setSeats] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checkoutStatus = params.get("checkout");
  useEffect(() => {
    if (checkoutStatus === "success") {
      qc.invalidateQueries({ queryKey: ["myPlan"] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    }
  }, [checkoutStatus, qc]);

  const p = PRICING[tier];
  const base = interval === "month" ? p.month : p.year;
  const seatUnit = interval === "month" ? p.seatMonth : p.seatYear;
  const total = base + seats * seatUnit;
  const per = interval === "month" ? "/mes" : "/año";

  async function go() {
    setError(null);
    try {
      await checkout.mutateAsync({ tier, interval, seats });
    } catch (e) {
      setError((e as Error).message || "No se pudo iniciar el pago.");
    }
  }

  const loginNext = `/login?next=${encodeURIComponent(`/membresia?tier=${tier}`)}`;

  return (
    <main
      className="min-h-[100dvh] px-5 py-8"
      style={{ background: "var(--color-bg)", color: "var(--color-fg)" }}
    >
      <div className="mx-auto w-full max-w-md">
        <TopBar />

        {checkoutStatus === "success" && (
          <div className="mb-5 rounded-[14px] px-4 py-3 flex items-center gap-2.5"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            <Check size={16} strokeWidth={2} className="text-green-400 shrink-0" />
            <p className="text-[13px]">¡Listo! Tu membresía se activó. Puede tardar unos segundos en reflejarse.</p>
          </div>
        )}
        {checkoutStatus === "cancel" && (
          <div className="mb-5 rounded-[14px] px-4 py-3"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-[13px] text-[var(--color-muted)]">Cancelaste el pago. Puedes intentarlo cuando quieras.</p>
          </div>
        )}

        {/* Plan actual */}
        {user && plan && (
          <div className="mb-5 rounded-[16px] p-4" style={{ background: "var(--color-bg-card)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--color-muted)]">Tu plan actual</span>
              <span className="flex items-center gap-1.5 text-[14px] font-medium">
                {plan.tier === "elite" ? <Sparkles size={14} className="text-warm" /> : plan.tier === "pro" ? <Crown size={14} className="text-accent" /> : null}
                {TIER_LABEL[plan.tier]}
              </span>
            </div>
          </div>
        )}

        {/* Dentro de la app de tienda: NO se procesa pago (políticas Apple/Google). */}
        {native ? (
          <div className="rounded-[16px] p-5 text-center space-y-3" style={{ background: "var(--color-bg-card)" }}>
            <ShieldCheck size={22} strokeWidth={1.5} className="mx-auto text-[var(--color-muted)]" />
            <p className="text-[14px] font-medium">Gestiona tu membresía en la web</p>
            <p className="text-[12px] text-[var(--color-muted)]">
              Por políticas de las tiendas, la suscripción y sus add-ons se gestionan
              desde <span className="text-[var(--color-fg)]">olympodynami.com</span> en tu navegador.
            </p>
          </div>
        ) : plan?.is_super_admin ? (
          <div className="rounded-[16px] p-5 text-center space-y-2" style={{ background: "var(--color-bg-card)" }}>
            <ShieldCheck size={22} strokeWidth={1.5} className="mx-auto text-warm" />
            <p className="text-[14px] font-medium">Tienes acceso completo</p>
            <p className="text-[12px] text-[var(--color-muted)]">Como super-admin no necesitas una suscripción.</p>
          </div>
        ) : (
          <>
            {/* Gestionar (Customer Portal) — solo si ya es de pago */}
            {user && plan && plan.tier !== "free" && (
              <button
                onClick={() => portal.mutate()}
                disabled={portal.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-pill py-3 mb-5 text-[14px] font-medium disabled:opacity-50"
                style={{ background: "var(--color-fg)", color: "var(--color-bg)" }}
              >
                <Settings size={15} strokeWidth={1.5} />
                {portal.isPending ? "Abriendo…" : "Gestionar mi membresía"}
              </button>
            )}

            <p className="text-[12px] text-[var(--color-muted)] mb-3 uppercase tracking-wider">
              {plan && plan.tier !== "free" ? "Cambiar de plan" : "Elige tu plan"}
            </p>

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
                      background: active ? `${color}14` : "var(--color-bg-card)",
                      border: `1.5px solid ${active ? color : "var(--color-border)"}`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {t === "elite" ? <Sparkles size={14} strokeWidth={1.5} style={{ color }} /> : <Crown size={14} strokeWidth={1.5} style={{ color }} />}
                      <span className="text-[14px] font-medium">{t === "elite" ? "Elite" : "Pro"}</span>
                    </div>
                    <p className="text-[13px] font-display font-semibold">
                      {money(PRICING[t].month)}
                      <span className="text-[11px] text-[var(--color-muted)] font-body font-normal">/mes</span>
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Toggle mensual/anual */}
            <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "var(--color-bg-card)" }}>
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
            <div className="rounded-[14px] px-4 py-3 mb-4 space-y-2" style={{ background: "var(--color-bg-card)" }}>
              {p.perks.map((perk) => (
                <div key={perk} className="flex items-center gap-2 text-[13px]">
                  <Check size={14} strokeWidth={2} style={{ color: tier === "elite" ? "#EFC88B" : "#CF5C36" }} />
                  {perk}
                </div>
              ))}
            </div>

            {/* Miembros extra (add-on) */}
            <div className="flex items-center justify-between rounded-[14px] px-4 py-3 mb-4" style={{ background: "var(--color-bg-card)" }}>
              <div className="min-w-0">
                <p className="text-[13px]">Miembros extra</p>
                <p className="text-[11px] text-[var(--color-muted)]">{money(seatUnit)}{per} cada uno</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => setSeats((s) => Math.max(0, s - 1))} disabled={seats === 0}
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}>
                  <Minus size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                </button>
                <span className="text-[15px] font-medium w-5 text-center tabular-nums">{seats}</span>
                <button onClick={() => setSeats((s) => s + 1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center" style={{ border: "1px solid var(--color-border)" }}>
                  <Plus size={14} strokeWidth={1.5} className="text-[var(--color-fg)]" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-[13px] text-[var(--color-muted)]">Total</span>
              <span className="font-display font-semibold text-[20px]">
                {money(total)}<span className="text-[12px] text-[var(--color-muted)] font-body font-normal">{per}</span>
              </span>
            </div>

            {error && <p className="text-[12px] text-accent mb-2 text-center">{error}</p>}

            {/* CTA: si hay sesión → checkout; si no → login y regresa */}
            {userLoading ? (
              <div className="w-full rounded-pill py-3.5" style={{ background: "var(--color-bg-card)" }} />
            ) : user ? (
              <button
                onClick={go}
                disabled={checkout.isPending}
                className="w-full flex items-center justify-center gap-2 rounded-pill py-3.5 text-[14px] font-semibold disabled:opacity-50"
                style={{ background: "var(--color-fg)", color: "var(--color-bg)" }}
              >
                {checkout.isPending ? "Redirigiendo…" : "Continuar al pago"}
              </button>
            ) : (
              <Link
                href={loginNext}
                className="w-full flex items-center justify-center gap-2 rounded-pill py-3.5 text-[14px] font-semibold"
                style={{ background: "var(--color-fg)", color: "var(--color-bg)" }}
              >
                Inicia sesión para continuar
              </Link>
            )}

            <p className="text-[11px] text-[var(--color-muted)] text-center mt-2.5">
              Pago seguro con Stripe · cancela cuando quieras
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function MembresiaPage() {
  return (
    <Suspense fallback={null}>
      <MembresiaInner />
    </Suspense>
  );
}
