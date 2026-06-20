"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMyGroups, useLeaderboard, useProfileStats } from "@/lib/hooks/useGroups";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useRouter } from "next/navigation";
import {
  LogOut, ChevronRight, ChevronLeft, Bell, BellOff, X,
  Trophy, Flame, Zap, Users, Copy, Check,
  ShieldCheck, Pencil,
} from "lucide-react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";

// ── Helpers ────────────────────────────────────────────────────────────────

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function formatWeekRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} – ${e.getDate()} de ${MESES_LARGOS[e.getMonth()]}`;
  }
  return `${s.getDate()} ${MESES[s.getMonth()]} – ${e.getDate()} ${MESES[e.getMonth()]}`;
}

// ── EditNameDrawer ─────────────────────────────────────────────────────────

function EditNameDrawer({ open, current, onSave, onClose }: { open: boolean; current: string; onSave: (n: string) => Promise<void>; onClose: () => void }) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!value.trim() || value === current) { onClose(); return; }
    setSaving(true);
    await onSave(value.trim());
    setSaving(false);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-10 pt-2">
        <h2 className="font-display font-medium text-[17px] mb-5">Editar nombre</h2>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] px-4 py-3 text-[15px] text-[var(--color-fg)] outline-none focus:border-warm/50 mb-4"
          placeholder="Tu nombre"
        />
        <button
          onClick={handleSave}
          disabled={saving || !value.trim()}
          className="w-full bg-warm text-accent-dark rounded-full py-3 text-[14px] font-medium disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Drawer>
  );
}

// ── CopyButton ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy} className="text-warm flex-shrink-0">
      {copied ? <Check size={15} strokeWidth={2} className="text-accent" /> : <Copy size={15} strokeWidth={1.5} />}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();
  const { user, signOut } = useUser();
  const { avatarUrl, displayName, uploadAvatar, refetch: refetchProfile } = useProfile();
  const { data: groups = [] } = useMyGroups();
  const { data: stats } = useProfileStats();

  // For position subtitle: use owned group leaderboard
  const ownedGroup = groups.find((g) => g.owner_id === user?.id) ?? groups[0] ?? null;
  const { data: leaderboard = [] } = useLeaderboard(ownedGroup?.id ?? null);
  const myPosition = leaderboard.find((e) => e.user_id === user?.id)?.position ?? null;

  const groupId = ownedGroup?.id ?? null;
  const { state: pushState, loading: pushLoading, error: pushError, success: pushSuccess, subscribe } = usePushNotifications(groupId);
  const [showNotifHelp, setShowNotifHelp] = useState(false);
  const [showEditName, setShowEditName] = useState(false);

  async function saveName(name: string) {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ full_name: name } as never)
      .eq("id", user.id);
    await refetchProfile();
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  const positionLabel = myPosition === 1 ? "1ero" : myPosition === 2 ? "2do" : myPosition === 3 ? "3ero" : myPosition ? `${myPosition}°` : null;

  return (
    <div className="pb-24">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-[18px] py-3">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        </button>
        <span className="text-[15px] font-medium">Perfil</span>
        <button onClick={() => setShowEditName(true)} aria-label="Editar perfil">
          <Pencil size={17} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </button>
      </div>

      <div className="px-4">
        {/* Hero */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <AvatarUpload
            avatarUrl={avatarUrl}
            displayName={displayName}
            size={74}
            onUpload={uploadAvatar}
          />
          <div className="font-display font-medium text-[20px] mt-3">{displayName}</div>
          {ownedGroup && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] mt-1">
              {ownedGroup.name}
              {positionLabel && <><span className="text-warm">·</span><span className="text-warm">{positionLabel}</span></>}
            </div>
          )}
        </div>

        {/* Stats chips */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-[var(--color-bg-card)] rounded-[14px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy size={14} strokeWidth={1.5} className="text-warm" />
              <span className="font-display font-medium text-[17px]">{stats?.titlesCount ?? 0}</span>
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">Títulos</div>
          </div>
          <div className="flex-1 bg-[var(--color-bg-card)] rounded-[14px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame size={14} strokeWidth={1.5} className="text-accent" />
              <span className="font-display font-medium text-[17px]">{stats?.bestStreak ?? 0}</span>
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">Mejor racha</div>
          </div>
          <div className="flex-1 bg-[var(--color-bg-card)] rounded-[14px] p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap size={14} strokeWidth={1.5} className="text-warm" />
              <span className="font-display font-medium text-[17px]">{stats?.lifetimePoints ?? 0}</span>
            </div>
            <div className="text-[10px] text-[var(--color-muted)]">Puntos</div>
          </div>
        </div>

        {/* Editar perfil */}
        <button
          onClick={() => setShowEditName(true)}
          className="w-full flex items-center justify-center gap-2 text-[12px] text-[var(--color-fg)] bg-[var(--color-bg-card)] border border-[#2a2a2a] rounded-[12px] py-2.5 mb-5"
        >
          <Pencil size={13} strokeWidth={1.5} />
          Editar perfil
        </button>

        {/* Mis grupos */}
        <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Mis grupos</p>
        <div className="space-y-2.5 mb-5">
          {groups.map((g) => {
            const isOwner = g.owner_id === user?.id;
            return (
              <div key={g.id} className="bg-[var(--color-bg-card)] rounded-[16px] px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-[30px] h-[30px] rounded-[10px] bg-warm/20 flex items-center justify-center flex-shrink-0">
                    <Users size={16} strokeWidth={1.5} className="text-warm" />
                  </div>
                  <div className="flex-1 leading-snug min-w-0">
                    <p className="text-[13px] truncate">{g.name}</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{g.members.length} {g.members.length === 1 ? "miembro" : "miembros"}</p>
                  </div>
                  <span className="text-[10px] text-warm border border-warm/50 rounded-full px-2.5 py-0.5 flex-shrink-0">
                    {isOwner ? "Dueño" : "Miembro"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1c1c1c]">
                  <span className="text-[11px] text-[var(--color-muted)]">Código de invitación</span>
                  <span className="flex-1" />
                  <span className="text-[12px] font-medium tracking-wider">{g.invite_code.toUpperCase()}</span>
                  <CopyButton text={g.invite_code} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Títulos ganados */}
        {(stats?.wonWeeks.length ?? 0) > 0 && (
          <>
            <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Títulos ganados</p>
            <div className="mb-5 divide-y divide-[#1c1c1c]">
              {stats!.wonWeeks.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 py-2.5">
                  <Trophy size={17} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                  <div className="flex-1 leading-snug min-w-0">
                    <p className="text-[13px] truncate">{w.group_name} · El más fuerte</p>
                    <p className="text-[11px] text-[var(--color-muted)]">{formatWeekRange(w.start_date, w.end_date)}</p>
                  </div>
                  <span className="text-[12px] text-[var(--color-muted)] flex-shrink-0">{w.total_points} pts</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Ajustes */}
        <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Ajustes</p>
        <div className="bg-[var(--color-bg-card)] rounded-[16px] px-4 divide-y divide-[#1c1c1c] mb-4">
          <div className="flex items-center gap-3 py-3">
            <span className="text-[13px] flex-1">Tema</span>
            <ThemeSwitch />
          </div>
          {pushState !== "unsupported" && (
            <div className="py-3">
              <div className="flex items-center gap-3">
                <span className="text-[13px] flex-1">Notificaciones</span>
                {pushState === "denied" ? (
                  <button onClick={() => setShowNotifHelp(true)} className="flex items-center gap-1.5 text-[12px] text-accent font-medium">
                    <BellOff size={13} strokeWidth={1.5} /> Activar
                  </button>
                ) : (
                  <button
                    onClick={subscribe}
                    disabled={pushLoading}
                    className="flex items-center gap-1.5 text-[12px] font-medium disabled:opacity-50"
                    style={{ color: pushState === "granted" ? "#EFC88B" : "#CF5C36" }}
                  >
                    {pushLoading
                      ? "Registrando…"
                      : pushState === "granted"
                      ? <><Bell size={13} strokeWidth={1.5} /> Activas · Reactivar</>
                      : "Activar"}
                  </button>
                )}
              </div>
              {pushError && (
                <p className="text-[11px] text-accent mt-1">{pushError}</p>
              )}
              {pushSuccess && (
                <p className="text-[11px] mt-1" style={{ color: "#22c55e" }}>Notificaciones activadas correctamente.</p>
              )}
            </div>
          )}
          <div className="flex items-center gap-3 py-3">
            <span className="text-[13px] flex-1">Idioma</span>
            <span className="text-[12px] text-[var(--color-muted)]">Español</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          </div>
        </div>

        {/* Cuenta */}
        <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Cuenta</p>
        <div className="bg-[var(--color-bg-card)] rounded-[16px] px-4 divide-y divide-[#1c1c1c]">
          <div className="flex items-center gap-3 py-3">
            <ShieldCheck size={17} strokeWidth={1.5} className="text-warm" />
            <span className="text-[13px] flex-1">Seguridad y contraseña</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 py-3 text-left">
            <LogOut size={17} strokeWidth={1.5} className="text-accent" />
            <span className="text-[13px] text-accent">Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* Edit name drawer */}
      <EditNameDrawer
        open={showEditName}
        current={displayName}
        onSave={saveName}
        onClose={() => setShowEditName(false)}
      />

      {/* Notif help modal */}
      {showNotifHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-black/75 backdrop-blur-sm" onClick={() => setShowNotifHelp(false)}>
          <div className="w-full max-w-sm bg-[#0e0e0e] border border-[#1f1f1f] rounded-[24px] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-medium text-[18px]">Activar notificaciones</span>
              <button onClick={() => setShowNotifHelp(false)} className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[var(--color-muted)]">
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-[13px] text-[var(--color-muted)] mb-5">Las notificaciones están bloqueadas. Sigue estos pasos para activarlas:</p>
            <ol className="space-y-4 mb-6">
              {[
                'Toca el ícono 🔒 en la barra de dirección del navegador.',
                'Selecciona "Permisos" o "Configuración del sitio".',
                'Busca "Notificaciones" y cámbialo a "Permitir".',
                "Recarga la página y toca Activar de nuevo.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[11px] text-warm flex-shrink-0 mt-0.5 font-medium">{i + 1}</span>
                  <span className="text-[13px] leading-snug">{step}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => setShowNotifHelp(false)} className="w-full py-3 rounded-full bg-[#1a1a1a] text-[13px] text-[var(--color-muted)]">Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
