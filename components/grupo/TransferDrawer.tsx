"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowRightLeft, Check, AlertTriangle } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { getInitials, planRequiredForMembers } from "@/lib/hooks/useGroups";
import type { GroupMemberWithProfile } from "@/lib/hooks/useGroups";

interface TransferDrawerProps {
  open: boolean;
  onClose: () => void;
  groupName: string;
  memberCount: number;
  members: GroupMemberWithProfile[];   // candidatos (sin el dueño actual)
  pending: boolean;
  onConfirm: (toUserId: string) => void;
}

export function TransferDrawer({ open, onClose, groupName, memberCount, members, pending, onConfirm }: TransferDrawerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const plan = planRequiredForMembers(memberCount);

  // Reinicia el estado cada vez que se abre/cierra
  useEffect(() => {
    if (!open) { setSelected(null); setConfirming(false); }
  }, [open]);

  const selectedMember = members.find((m) => m.user_id === selected);

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        {!confirming ? (
          <>
            <p className="font-display font-semibold text-[18px] text-center mb-1">Transferir propiedad</p>
            <p className="text-[12px] text-[var(--color-muted)] text-center mb-1">
              Elige a quién pasar <span className="text-warm">{groupName}</span>.
            </p>
            <p className="text-[11px] text-[var(--color-muted)] text-center mb-4">
              Recibirá un informe y tendrá 48 h para aceptar · Plan requerido:{" "}
              <span className="text-warm">{plan.label}</span> · {plan.cost}
            </p>

            <div className="flex flex-col gap-2 max-h-[44vh] overflow-y-auto no-scrollbar mb-4">
              {members.map((m) => {
                const isSel = m.user_id === selected;
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setSelected(m.user_id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[14px] transition-colors"
                    style={{
                      background: isSel ? "rgba(239,200,139,0.10)" : "var(--color-surface)",
                      border: isSel ? "1.5px solid var(--color-warm)" : "1px solid var(--color-border)",
                    }}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-bg-card)" }}>
                      {m.avatar_url ? (
                        <Image src={m.avatar_url} alt={m.full_name ?? ""} width={36} height={36} className="object-cover w-full h-full" unoptimized={m.avatar_url.includes("?t=")} referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-[12px] font-medium text-[var(--color-muted)]">{getInitials(m.full_name)}</span>
                      )}
                    </div>
                    <span className="flex-1 text-left text-[14px] truncate" style={{ color: isSel ? "var(--color-warm)" : "var(--color-fg)", fontWeight: isSel ? 500 : 400 }}>
                      {m.full_name ?? "—"}
                    </span>
                    {isSel
                      ? <Check size={17} strokeWidth={2.5} className="text-warm flex-shrink-0" />
                      : <ArrowRightLeft size={15} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setConfirming(true)}
              disabled={!selected}
              className="w-full rounded-pill py-3.5 text-[14px] font-medium transition-opacity"
              style={{
                background: selected ? "var(--color-warm)" : "var(--color-surface)",
                color: selected ? "#1a1000" : "var(--color-muted)",
                opacity: selected ? 1 : 0.6,
              }}
            >
              Aceptar
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-14 h-14 rounded-full bg-warm/10 border border-warm/30 flex items-center justify-center mb-4">
              <AlertTriangle size={24} strokeWidth={1.5} className="text-warm" />
            </div>
            <p className="font-display font-semibold text-[18px] mb-1">¿Seguro que quieres transferir?</p>
            <p className="text-[13px] text-[var(--color-muted)] mb-1">
              Pasarás <span className="text-warm font-medium">{groupName}</span> a
            </p>
            <p className="text-[14px] font-medium mb-4">{selectedMember?.full_name ?? "—"}</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-6" style={{ lineHeight: 1.5 }}>
              Dejarás de ser el dueño cuando la persona acepte. Podrá administrar el grupo,
              sus temporadas y miembros.
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={() => selected && onConfirm(selected)}
                disabled={pending}
                className="w-full bg-warm text-accent-dark rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50"
              >
                {pending ? "Enviando..." : "Sí, transferir"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="w-full text-[var(--color-fg)] rounded-pill py-3.5 text-[14px] disabled:opacity-50" style={{ background: "var(--color-surface)" }}
              >
                Volver
              </button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
