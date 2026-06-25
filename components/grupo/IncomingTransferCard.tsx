"use client";

import { useState } from "react";
import { ArrowRightLeft, Users, CreditCard, Check, X, Crown } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { useIncomingTransfers, useRespondTransfer, planRequiredForMembers } from "@/lib/hooks/useGroups";

function hoursLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expira pronto";
  const h = Math.floor(ms / 3600000);
  if (h >= 1) return `${h} h restantes`;
  const m = Math.max(1, Math.floor(ms / 60000));
  return `${m} min restantes`;
}

// Informe + aceptar/rechazar de transferencias de propiedad entrantes.
interface AcceptedSummary { groupName: string; memberCount: number; planLabel: string; }

export function IncomingTransferCard() {
  const { data: transfers = [] } = useIncomingTransfers();
  const respond = useRespondTransfer();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<AcceptedSummary | null>(null);

  async function act(transferId: string, accept: boolean, summary?: AcceptedSummary) {
    setBusyId(transferId);
    setError(null);
    try {
      await respond.mutateAsync({ transferId, accept });
      if (accept && summary) setAccepted(summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo responder");
    } finally {
      setBusyId(null);
    }
  }

  // Drawer de confirmación al aceptar (resumen del grupo recibido)
  const acceptedDrawer = (
    <Drawer open={!!accepted} onClose={() => setAccepted(null)}>
      {accepted && (
        <div className="px-5 pb-8 pt-1 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-warm/15 border border-warm/30 flex items-center justify-center mb-4">
            <Crown size={26} strokeWidth={1.5} className="text-warm" />
          </div>
          <p className="font-display font-semibold text-[18px] mb-1">¡Transferencia aceptada!</p>
          <p className="text-[13px] text-[var(--color-muted)] mb-4">
            Ahora eres el dueño de <span className="text-warm font-medium">{accepted.groupName}</span>
          </p>
          <div className="w-full rounded-[12px] px-3 py-2.5 mb-5 space-y-2" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Users size={13} strokeWidth={1.5} /> Miembros</span>
              <span className="text-[var(--color-fg)]">{accepted.memberCount}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><CreditCard size={13} strokeWidth={1.5} /> Plan</span>
              <span className="text-[var(--color-fg)]">{accepted.planLabel}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Crown size={13} strokeWidth={1.5} /> Rol</span>
              <span className="text-warm">Dueño · puede iniciar temporadas</span>
            </div>
          </div>
          <button
            onClick={() => setAccepted(null)}
            className="w-full bg-warm text-accent-dark rounded-pill py-3.5 text-[14px] font-medium"
          >
            Continuar a grupo
          </button>
        </div>
      )}
    </Drawer>
  );

  if (transfers.length === 0) return acceptedDrawer;

  return (
    <div className="flex flex-col gap-3 mb-3">
      {transfers.map((t) => {
        const plan = planRequiredForMembers(t.member_count);
        const busy = busyId === t.id;
        return (
          <div
            key={t.id}
            className="rounded-[18px] p-4"
            style={{ background: "var(--color-bg-card)", border: "1px solid rgba(239,200,139,0.35)" }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,200,139,0.15)" }}>
                <ArrowRightLeft size={16} strokeWidth={1.5} className="text-warm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium">Transferencia de grupo</p>
                <p className="text-[11px] text-[var(--color-muted)] truncate">
                  {t.from_name ?? "Alguien"} quiere pasarte <span className="text-warm">{t.group_name}</span>
                </p>
              </div>
            </div>

            {/* Informe */}
            <div className="rounded-[12px] px-3 py-2.5 mb-3 space-y-2" style={{ background: "var(--color-surface)" }}>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Users size={13} strokeWidth={1.5} /> Miembros</span>
                <span className="text-[var(--color-fg)]">{t.member_count}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><CreditCard size={13} strokeWidth={1.5} /> Plan requerido</span>
                <span className="text-[var(--color-fg)]">{plan.label} · {plan.cost}</span>
              </div>
            </div>

            {plan.tier !== "free" && (
              <p className="text-[11px] text-[var(--color-muted)] mb-3" style={{ lineHeight: 1.5 }}>
                Si aceptas, a partir del siguiente ciclo el pago de este grupo corre por tu cuenta
                (plan {plan.label}).
              </p>
            )}

            <p className="text-[11px] text-[var(--color-muted)] mb-3">{hoursLeft(t.expires_at)}</p>

            {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => act(t.id, true, { groupName: t.group_name, memberCount: t.member_count, planLabel: plan.label })}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 bg-warm text-accent-dark text-[13px] font-medium rounded-pill py-2.5 disabled:opacity-50"
              >
                <Check size={15} strokeWidth={2} /> {busy ? "..." : "Aceptar"}
              </button>
              <button
                onClick={() => act(t.id, false)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 text-[13px] rounded-pill py-2.5 disabled:opacity-50"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <X size={15} strokeWidth={2} /> Rechazar
              </button>
            </div>
          </div>
        );
      })}
      {acceptedDrawer}
    </div>
  );
}
