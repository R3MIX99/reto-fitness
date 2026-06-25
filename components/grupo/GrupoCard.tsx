"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, UserPlus, Plus, Hash, Check, LogOut, AlertTriangle, ArrowRightLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import type { GroupWithMembers } from "@/lib/hooks/useGroups";
import { getInitials, useLeaveGroup, useDeleteGroup, useTransferGroup } from "@/lib/hooks/useGroups";
import { computePhase, type Season } from "@/lib/hooks/useSeasons";
import { TransferDrawer } from "@/components/grupo/TransferDrawer";
import Image from "next/image";

const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}`;
}

// ── Portal: saca los modales del div con transform (swipe) para que
//    position:fixed se posicione respecto a la pantalla y no a la tarjeta. ──
function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ── Dropdown con slide-down ────────────────────────────────────────────────

function SlideDown({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      // mide altura real en el siguiente frame
      requestAnimationFrame(() => {
        if (ref.current) setHeight(ref.current.scrollHeight);
      });
    } else {
      setHeight(0);
      // oculta después de que termine la transición
      const t = setTimeout(() => setVisible(false), 280);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!visible && !open) return null;

  return (
    <div
      style={{
        height,
        overflow: "hidden",
        transition: "height 0.28s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <div ref={ref} className="pb-4">{children}</div>
    </div>
  );
}

// ── Toast cambio de grupo ──────────────────────────────────────────────────

function SwitchToast({ name, onDone }: { name: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed top-[72px] left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg"
      style={{
        background: "var(--color-bg-card2)",
        border: "1px solid var(--color-border)",
        transform: `translateX(-50%) translateY(${visible ? "0" : "-16px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
      }}
    >
      <div className="w-5 h-5 rounded-full bg-warm/20 flex items-center justify-center flex-shrink-0">
        <Check size={11} strokeWidth={2.5} className="text-warm" />
      </div>
      <span className="text-[13px] font-medium text-[var(--color-fg)] whitespace-nowrap">
        {name}
      </span>
    </div>
  );
}

// ── GrupoCard ─────────────────────────────────────────────────────────────

interface GrupoCardProps {
  group: GroupWithMembers;
  allGroups: GroupWithMembers[];
  season: Season | null;
  currentUserId: string;
  onInvite: () => void;
  onSwitchGroup: (id: string) => void;
  onLeft: () => void;
}

export function GrupoCard({ group, allGroups, season, currentUserId, onInvite, onSwitchGroup, onLeft }: GrupoCardProps) {
  const [open, setOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferDone, setTransferDone] = useState(false);
  const [leftGroup, setLeftGroup] = useState<string | null>(null);
  const [switchedTo, setSwitchedTo] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const transferGroup = useTransferGroup();

  const shownMembers = group.members.slice(0, 2);
  const extra = group.members.length - 2;
  const isOwner = group.owner_id === currentUserId;
  const isOnlyGroup = allGroups.length <= 1;
  const otherMembers = group.members.filter((m) => m.user_id !== currentUserId);

  async function handleLeave() {
    try {
      const name = group.name;
      await leaveGroup.mutateAsync(group.id);
      setConfirmLeave(false);
      setLeftGroup(name);
      onLeft();
      setTimeout(() => setLeftGroup(null), 3000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo salir");
    }
  }

  async function handleDelete() {
    try {
      const name = group.name;
      await deleteGroup.mutateAsync(group.id);
      setConfirmDelete(false);
      setLeftGroup(name);
      onLeft();
      setTimeout(() => setLeftGroup(null), 3000);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo borrar");
    }
  }

  async function handleTransfer(toUserId: string) {
    try {
      await transferGroup.mutateAsync({ groupId: group.id, toUserId });
      setShowTransfer(false);
      setTransferDone(true);
      setTimeout(() => setTransferDone(false), 3500);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "No se pudo transferir");
    }
  }

  function handleSwitch(id: string, name: string) {
    if (id === group.id) { setOpen(false); return; }
    setOpen(false);
    onSwitchGroup(id);
    setSwitchedTo(name);
  }

  return (
    <>
      <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
        {/* Nombre + avatares */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <span className="font-display font-medium text-[18px] truncate">{group.name}</span>
            <ChevronDown
              size={16} strokeWidth={1.5}
              className="text-[var(--color-muted)] flex-shrink-0 transition-transform duration-250"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Avatar stack */}
          <div className="flex items-center flex-shrink-0">
            {shownMembers.map((m, i) => (
              <div
                key={m.user_id}
                className="w-6 h-6 rounded-full border-[1.5px] border-[var(--color-bg-card)] flex items-center justify-center text-[9px] font-medium overflow-hidden"
                style={{ marginLeft: i > 0 ? -8 : 0, zIndex: shownMembers.length - i }}
              >
                {m.avatar_url ? (
                  <Image src={m.avatar_url} alt={m.full_name ?? ""} width={24} height={24} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-accent text-accent-dark flex items-center justify-center text-[9px] font-medium">
                    {getInitials(m.full_name)}
                  </div>
                )}
              </div>
            ))}
            {extra > 0 && (
              <div
                className="w-6 h-6 rounded-full border-[1.5px] border-[var(--color-bg-card)] flex items-center justify-center text-[9px] font-medium"
                style={{ background: "var(--color-surface)", marginLeft: -8 }}
              >
                +{extra}
              </div>
            )}
          </div>
        </div>

        {/* Dropdown con slide animado */}
        <SlideDown open={open}>
          <div className="rounded-[14px] overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {allGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSwitch(g.id, g.name)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}
              >
                <span className="flex-1 text-[14px] truncate">{g.name}</span>
                {g.id === group.id && <Check size={14} strokeWidth={2} className="text-warm flex-shrink-0" />}
              </button>
            ))}

            <div className="border-t" style={{ borderColor: "var(--color-border)" }} />

            <Link
              href="/grupo/crear"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}
            >
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Plus size={14} strokeWidth={1.5} className="text-accent" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Crear grupo</p>
                <p className="text-[11px] text-[var(--color-muted)]">Genera un código de invitación</p>
              </div>
            </Link>

            <Link
              href="/grupo/unirse"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3"
            >
              <div className="w-7 h-7 rounded-full bg-warm/20 flex items-center justify-center flex-shrink-0">
                <Hash size={14} strokeWidth={1.5} className="text-warm" />
              </div>
              <div>
                <p className="text-[13px] font-medium">Unirse con código</p>
                <p className="text-[11px] text-[var(--color-muted)]">Ingresa el código de un amigo</p>
              </div>
            </Link>

            {/* Acciones de gestión del grupo */}
            <div className="border-t mx-3" style={{ borderColor: "var(--color-border)" }} />

            {isOwner ? (
              <>
                {/* Transferir propiedad (necesita al menos otro miembro) */}
                {otherMembers.length > 0 && (
                  <button
                    onClick={() => { setOpen(false); setShowTransfer(true); }}
                    className="w-full flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}
                  >
                    <div className="w-7 h-7 rounded-full bg-warm/15 flex items-center justify-center flex-shrink-0">
                      <ArrowRightLeft size={14} strokeWidth={1.5} className="text-warm" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-medium">Transferir propiedad</p>
                      <p className="text-[11px] text-[var(--color-muted)]">Pasa el grupo a otro miembro</p>
                    </div>
                  </button>
                )}
                {/* Borrar grupo (bloqueado si es el único) */}
                <button
                  onClick={() => { if (isOnlyGroup) return; setOpen(false); setConfirmDelete(true); }}
                  disabled={isOnlyGroup}
                  className="w-full flex items-center gap-3 px-4 py-3 disabled:opacity-40"
                >
                  <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={14} strokeWidth={1.5} className="text-red-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] text-red-400">Borrar grupo</p>
                    {isOnlyGroup && <p className="text-[11px] text-[var(--color-muted)]">No puedes borrar tu único grupo</p>}
                  </div>
                </button>
              </>
            ) : (
              <button
                onClick={() => { if (isOnlyGroup) return; setOpen(false); setConfirmLeave(true); }}
                disabled={isOnlyGroup}
                className="w-full flex items-center gap-3 px-4 py-3 disabled:opacity-40"
              >
                <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <LogOut size={14} strokeWidth={1.5} className="text-red-400" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] text-red-400">Salir del grupo</p>
                  {isOnlyGroup && <p className="text-[11px] text-[var(--color-muted)]">No puedes dejar tu único grupo</p>}
                </div>
              </button>
            )}
          </div>
        </SlideDown>

        {/* Chips de temporada */}
        <div className="flex items-center gap-2 mb-4">
          {(() => {
            if (!season) {
              return (
                <span className="text-[11px] text-[var(--color-muted)] rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>
                  Sin temporada activa
                </span>
              );
            }
            const phase = computePhase(season);
            if (!phase.hasStarted) {
              return (
                <>
                  <span className="text-[11px] text-[var(--color-muted)] rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>
                    Programada
                  </span>
                  <span className="text-[11px] text-warm border border-warm/50 rounded-full px-3 py-1">
                    Empieza {fmtDate(season.start_date)}
                  </span>
                </>
              );
            }
            return (
              <>
                <span className="text-[11px] text-[var(--color-muted)] rounded-full px-3 py-1" style={{ border: "1px solid var(--color-border)" }}>
                  {season.status === "reviewing" ? "En revisión" : `Fase ${phase.currentPhase}/${phase.totalPhases}`}
                </span>
                <span className="text-[11px] text-warm border border-warm/50 rounded-full px-3 py-1">
                  Termina {fmtDate(season.end_date)}
                </span>
              </>
            );
          })()}
        </div>

        {/* Botón invitar */}
        <button
          onClick={onInvite}
          className="w-full flex items-center justify-center gap-1.5 bg-warm text-accent-dark text-[12px] font-medium rounded-[12px] py-2.5"
        >
          <UserPlus size={14} strokeWidth={1.5} />
          Invitar amigos
        </button>
      </div>

      {/* Drawer de transferencia (selector + confirmación, deslizable) */}
      <TransferDrawer
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        groupName={group.name}
        memberCount={group.members.length}
        members={otherMembers}
        pending={transferGroup.isPending}
        onConfirm={handleTransfer}
      />

      <Portal>
      {/* Toast cambio de grupo */}
      {switchedTo && (
        <SwitchToast name={switchedTo} onDone={() => setSwitchedTo(null)} />
      )}

      {/* Toast: salida de grupo */}
      {leftGroup && (
        <div className="fixed bottom-[88px] left-4 right-4 z-[90] flex justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Check size={14} strokeWidth={2} className="text-[var(--color-muted)] flex-shrink-0" />
            <p className="text-[13px] text-[var(--color-fg)]">
              Saliste de <span className="font-medium text-warm">{leftGroup}</span>
            </p>
          </div>
        </div>
      )}

      {/* Modal confirmación salir */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmLeave(false)} />
          <div className="relative w-full max-w-[420px] rounded-t-[24px] pb-[88px] pt-6 px-6 flex flex-col items-center text-center animate-slide-up" style={{ background: "var(--color-bg-card)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-border)" }} />
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <AlertTriangle size={26} strokeWidth={1.5} className="text-red-400" />
            </div>
            <p className="font-display font-semibold text-[18px] mb-1">¿Salir del grupo?</p>
            <p className="text-[13px] text-[var(--color-muted)] mb-1">Estás a punto de abandonar</p>
            <p className="text-[14px] font-medium text-warm mb-4">{group.name}</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-6">
              Serás removido del ranking y tus puntos en este grupo serán eliminados.
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleLeave}
                disabled={leaveGroup.isPending}
                className="w-full bg-red-500/80 text-white rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50"
              >
                {leaveGroup.isPending ? "Saliendo..." : "Sí, salir del grupo"}
              </button>
              <button
                onClick={() => setConfirmLeave(false)}
                className="w-full text-[var(--color-fg)] rounded-pill py-3.5 text-[14px]" style={{ background: "var(--color-surface)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación borrar grupo (dueño) */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-[420px] rounded-t-[24px] pb-[88px] pt-6 px-6 flex flex-col items-center text-center animate-slide-up" style={{ background: "var(--color-bg-card)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-border)" }} />
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <Trash2 size={26} strokeWidth={1.5} className="text-red-400" />
            </div>
            <p className="font-display font-semibold text-[18px] mb-1">¿Borrar el grupo?</p>
            <p className="text-[14px] font-medium text-warm mb-4">{group.name}</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-6">
              Esto elimina el grupo para <span className="text-red-400 font-medium">todos los miembros</span>, junto con sus checklists, puntos, temporadas e historial. Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleDelete}
                disabled={deleteGroup.isPending}
                className="w-full bg-red-500/80 text-white rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50"
              >
                {deleteGroup.isPending ? "Borrando..." : "Sí, borrar el grupo"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full text-[var(--color-fg)] rounded-pill py-3.5 text-[14px]" style={{ background: "var(--color-surface)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast: solicitud de transferencia enviada */}
      {transferDone && (
        <div className="fixed bottom-[88px] left-4 right-4 z-[90] flex justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Check size={14} strokeWidth={2} className="text-warm flex-shrink-0" />
            <p className="text-[13px] text-[var(--color-fg)]">Transferencia pendiente · esperando respuesta</p>
          </div>
        </div>
      )}

      {/* Toast: error de acción */}
      {actionError && (
        <div className="fixed inset-0 z-[95] flex items-end justify-center px-4" onClick={() => setActionError(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-[420px] rounded-t-[24px] pb-[88px] pt-6 px-6 flex flex-col items-center text-center animate-slide-up" style={{ background: "var(--color-bg-card)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "var(--color-border)" }} />
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
              <AlertTriangle size={24} strokeWidth={1.5} className="text-red-400" />
            </div>
            <p className="text-[14px] mb-6">{actionError}</p>
            <button
              onClick={() => setActionError(null)}
              className="w-full text-[var(--color-fg)] rounded-pill py-3.5 text-[14px]" style={{ background: "var(--color-surface)" }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      </Portal>
    </>
  );
}
