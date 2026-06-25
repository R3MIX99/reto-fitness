"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Shield, ChevronRight, Users, Layers } from "lucide-react";
import { usePlan, TIER_LABEL, TIER_PRICE } from "@/lib/hooks/usePlan";

// Tarjeta de plan en el perfil: plan actual, uso de grupos y acceso al panel
// de super-admin. El botón "Mejorar plan" conecta el cobro en la Fase 4.
export function PlanCard() {
  const { data: plan } = usePlan();
  const [soon, setSoon] = useState(false);
  if (!plan) return null;

  const unlimited = plan.is_super_admin;
  const tierColor = plan.tier === "elite" ? "#EFC88B" : plan.tier === "pro" ? "#CF5C36" : "var(--color-muted)";

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[16px] p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Crown size={16} strokeWidth={1.5} style={{ color: tierColor }} />
          <span className="text-[14px] font-medium">Plan {TIER_LABEL[plan.tier]}</span>
          {plan.is_super_admin && (
            <span className="flex items-center gap-1 text-[10px] text-warm border border-warm/40 rounded-full px-2 py-0.5">
              <Shield size={10} strokeWidth={1.5} /> Super-admin
            </span>
          )}
        </div>
        {!plan.is_super_admin && (
          <span className="text-[12px] text-[var(--color-muted)]">{TIER_PRICE[plan.tier]}</span>
        )}
      </div>

      <div className="rounded-[12px] px-3 py-2.5 space-y-2 mb-3" style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Layers size={13} strokeWidth={1.5} /> Grupos creados</span>
          <span className="text-[var(--color-fg)]">{plan.owned_groups} / {unlimited ? "∞" : plan.max_groups}</span>
        </div>
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Users size={13} strokeWidth={1.5} /> Miembros por grupo</span>
          <span className="text-[var(--color-fg)]">hasta {unlimited ? "∞" : plan.max_members}</span>
        </div>
      </div>

      {plan.is_super_admin ? (
        <Link
          href="/admin"
          className="w-full flex items-center justify-center gap-2 text-[13px] font-medium rounded-pill py-2.5 bg-warm text-accent-dark"
        >
          <Shield size={14} strokeWidth={1.5} /> Panel de super-admin
          <ChevronRight size={14} strokeWidth={1.5} />
        </Link>
      ) : plan.tier !== "elite" ? (
        <>
          <button
            onClick={() => setSoon(true)}
            className="w-full flex items-center justify-center gap-2 text-[13px] font-medium rounded-pill py-2.5 bg-warm text-accent-dark"
          >
            <Crown size={14} strokeWidth={1.5} /> Mejorar plan
          </button>
          {soon && (
            <p className="text-[11px] text-[var(--color-muted)] text-center mt-2">
              El pago de planes estará disponible muy pronto.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
