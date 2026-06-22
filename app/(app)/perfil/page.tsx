"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/hooks/useUser";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMyGroups, useLeaderboard, useProfileStats } from "@/lib/hooks/useGroups";
import { useMyTitles, useEquipTitle } from "@/lib/hooks/usePlayerCard";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useRouter } from "next/navigation";
import {
  LogOut, ChevronRight, ChevronLeft, Bell, BellOff, X,
  Trophy, Flame, Zap, Users, Copy, Check,
  Pencil, Crown, Sparkles, Medal, SlidersHorizontal,
  Globe, AlertTriangle, Trash2,
} from "lucide-react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import { createClient } from "@/lib/supabase/client";
import { Drawer } from "@/components/ui/Drawer";

// ── Helpers ────────────────────────────────────────────────────────────────

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const MEDAL_COLORS: Record<number, string> = { 1: "#EFC88B", 2: "#C0C0C0", 3: "#CD7F32" };

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

  // Sincronizar el valor cada vez que el drawer se abre para que muestre el nombre real
  useEffect(() => {
    if (open) setValue(current);
  }, [open, current]);

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
          className="w-full rounded-[14px] px-4 py-3 text-[15px] text-[var(--color-fg)] outline-none focus:border-warm/50 mb-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
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

// ── LanguageDrawer ─────────────────────────────────────────────────────────

function LanguageDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-10 pt-2">
        <h2 className="font-display font-medium text-[17px] mb-5">Idioma</h2>

        <div
          className="flex items-center gap-3 rounded-[14px] px-4 py-3 mb-4"
          style={{ background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.4)" }}
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
            style={{ border: "2px solid #EFC88B", background: "#EFC88B" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-bg)]" />
          </div>
          <span className="text-[14px] flex-1">Español</span>
          <Check size={15} strokeWidth={2} className="text-warm flex-shrink-0" />
        </div>

        <div
          className="flex items-start gap-2.5 rounded-[12px] px-3.5 py-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <Globe size={14} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[var(--color-muted)]">
            Estamos desarrollando más idiomas para ti. Próximamente podrás elegir entre más opciones.
          </p>
        </div>
      </div>
    </Drawer>
  );
}

// ── DeleteAccountDrawer ────────────────────────────────────────────────────

function DeleteAccountDrawer({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = input.trim().toUpperCase() === "ELIMINAR";

  useEffect(() => {
    if (!open) { setInput(""); setError(null); }
  }, [open]);

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la cuenta");
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onClose={loading ? () => {} : onClose}>
      <div className="px-5 pb-10 pt-2">
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle size={18} strokeWidth={1.5} style={{ color: "#ef4444" }} />
          <h2 className="font-display font-medium text-[17px]" style={{ color: "#ef4444" }}>Eliminar cuenta</h2>
        </div>

        <div
          className="rounded-[14px] p-4 mb-5"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <p className="text-[13px] leading-relaxed" style={{ color: "#fca5a5" }}>
            Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán:
          </p>
          <ul className="mt-2 space-y-1">
            {["Tu perfil y foto", "Tu historial de checks y evidencias", "Tus metas personales", "Tu membresía en todos los grupos"].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12px]" style={{ color: "#fca5a5" }}>
                <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#ef4444" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-[var(--color-fg)] mb-2">
          Escribe <strong>ELIMINAR</strong> para confirmar:
        </p>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="ELIMINAR"
          className="w-full rounded-[14px] px-4 py-3 text-[15px] outline-none mb-4 disabled:opacity-50"
          style={{
            background: "var(--color-surface)",
            border: `1px solid ${canDelete ? "rgba(239,68,68,0.6)" : "var(--color-border)"}`,
            color: "var(--color-fg)",
          }}
        />

        {error && (
          <p className="text-[12px] text-red-400 mb-3">{error}</p>
        )}

        <button
          onClick={handleDelete}
          disabled={!canDelete || loading}
          className="w-full rounded-full py-3 text-[14px] font-medium transition-opacity disabled:opacity-40"
          style={{
            background: canDelete ? "rgba(239,68,68,0.9)" : "var(--color-surface)",
            color: canDelete ? "#fff" : "var(--color-muted)",
            border: canDelete ? "none" : "1px solid var(--color-border)",
          }}
        >
          {loading ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
        </button>
      </div>
    </Drawer>
  );
}

// ── PreferencesDrawer ──────────────────────────────────────────────────────

type GenderOption = "male" | "female" | "other";

function PreferencesDrawer({
  open,
  currentGender,
  onSave,
  onClose,
}: {
  open: boolean;
  currentGender: string | null;
  onSave: (gender: GenderOption) => Promise<void>;
  onClose: () => void;
}) {
  const [gender, setGender] = useState<GenderOption>(
    (currentGender as GenderOption) ?? "male"
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(gender);
    setSaving(false);
    onClose();
  }

  const options: { value: GenderOption; label: string }[] = [
    { value: "male",   label: "Masculino" },
    { value: "female", label: "Femenino" },
    { value: "other",  label: "Otro" },
  ];

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-10 pt-2">
        <h2 className="font-display font-medium text-[17px] mb-1">Preferencias</h2>
        <p className="text-[12px] text-[var(--color-muted)] mb-5">
          Estas preferencias afectan cómo se muestran tus títulos y estadísticas.
        </p>

        <p className="text-[13px] font-medium mb-2.5">Género</p>
        <div className="flex flex-col gap-2 mb-6">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              className="flex items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-colors"
              style={{
                background: gender === opt.value ? "rgba(239,200,139,0.12)" : "var(--color-surface)",
                border: `1px solid ${gender === opt.value ? "rgba(239,200,139,0.5)" : "var(--color-border)"}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{
                  border: `2px solid ${gender === opt.value ? "#EFC88B" : "var(--color-muted)"}`,
                  background: gender === opt.value ? "#EFC88B" : "transparent",
                }}
              >
                {gender === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-bg)]" />}
              </div>
              <span className="text-[14px]">{opt.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-warm text-[#1a0f08] rounded-full py-3 text-[14px] font-medium disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </Drawer>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const router = useRouter();
  const { user, signOut } = useUser();
  const { profile, avatarUrl, displayName, uploadAvatar, refetch: refetchProfile } = useProfile();
  const { data: groups = [] } = useMyGroups();
  const { data: stats } = useProfileStats();
  const { data: myTitles = [] } = useMyTitles();
  const equip = useEquipTitle();
  const qc = useQueryClient();

  // For position subtitle: use owned group leaderboard
  const ownedGroup = groups.find((g) => g.owner_id === user?.id) ?? groups[0] ?? null;
  const { data: leaderboard = [] } = useLeaderboard(ownedGroup?.id ?? null);
  const myPosition = leaderboard.find((e) => e.user_id === user?.id)?.position ?? null;

  const groupId = ownedGroup?.id ?? null;
  const { state: pushState, loading: pushLoading, error: pushError, success: pushSuccess, subscribe } = usePushNotifications(groupId);
  const [showNotifHelp, setShowNotifHelp] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [titleToast, setTitleToast] = useState(false);

  // Título equipado (para mostrarlo bajo el nombre)
  const championships = myTitles.filter((t) => t.rank === 1).length;
  const equippedTitle = myTitles.find((t) => t.season_id === profile?.equipped_season_id) ?? null;
  // Rosa SOLO si el título equipado es el que cruzó el umbral legendario
  const equippedIsLegend = equippedTitle?.is_legend_unlock === true;

  function changeTitle(seasonId: string | null) {
    equip.mutate(seasonId, {
      onSuccess: () => {
        refetchProfile();
        setTitleToast(true);
        setTimeout(() => setTitleToast(false), 2000);
      },
    });
  }

  async function savePreferences(gender: "male" | "female" | "other") {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ gender } as never)
      .eq("id", user.id);
    await refetchProfile();
    // Invalidar caches para que los títulos reflejen el género actualizado
    qc.invalidateQueries({ queryKey: ["playerCard"] });
    qc.invalidateQueries({ queryKey: ["myTitles"] });
  }

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

  async function handleDeleteAccount() {
    const res = await fetch("/api/user/delete", { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Error al eliminar la cuenta");
    }
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

          {/* Título equipado */}
          {equippedTitle && (
            <span
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3 py-1 mt-2 ${equippedIsLegend ? "glow-pink" : ""}`}
              style={{
                color: equippedIsLegend ? "#fff" : equippedTitle.rank === 3 ? "#fff" : "#1a0f08",
                background: equippedIsLegend ? "linear-gradient(90deg,#F472B6,#A78BFA)" : MEDAL_COLORS[equippedTitle.rank] ?? "#EFC88B",
              }}
            >
              {equippedIsLegend ? <Sparkles size={12} strokeWidth={2} /> : equippedTitle.rank === 1 ? <Crown size={12} strokeWidth={2} /> : <Medal size={12} strokeWidth={2} />}
              {equippedTitle.title}
            </span>
          )}

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
          className="w-full flex items-center justify-center gap-2 text-[12px] text-[var(--color-fg)] bg-[var(--color-bg-card)] rounded-[12px] py-2.5 mb-5" style={{ border: "1px solid var(--color-border)" }}
        >
          <Pencil size={13} strokeWidth={1.5} />
          Editar perfil
        </button>

        {/* Tu título (selector) */}
        <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Tu título</p>
        {myTitles.length === 0 ? (
          <div className="mb-5 rounded-[14px] p-4 flex items-start gap-3" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <Trophy size={17} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-[var(--color-muted)]">
              Aún no tienes títulos. Gana una temporada para equipar tu título de campeón y mostrarlo en tu tarjeta.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-1.5">
              {myTitles.map((t) => {
                const isEquipped = profile?.equipped_season_id === t.season_id;
                return (
                  <button
                    key={t.season_id}
                    disabled={equip.isPending}
                    onClick={() => changeTitle(isEquipped ? null : t.season_id)}
                    className="flex items-center gap-3 rounded-[12px] px-3.5 py-3 text-left"
                    style={{
                      background: isEquipped
                        ? (t.is_legend_unlock ? "rgba(244,114,182,0.1)" : "rgba(239,200,139,0.12)")
                        : "var(--color-bg-card)",
                      border: `1px solid ${
                        t.is_legend_unlock
                          ? isEquipped ? "rgba(244,114,182,0.6)" : "rgba(244,114,182,0.4)"
                          : isEquipped ? "rgba(239,200,139,0.4)" : "var(--color-border)"
                      }`,
                      boxShadow: t.is_legend_unlock ? "0 0 10px rgba(244,114,182,0.2)" : undefined,
                    }}
                  >
                    <Trophy size={16} strokeWidth={1.5} className="flex-shrink-0" style={{ color: t.is_legend_unlock ? "#F472B6" : (MEDAL_COLORS[t.rank] ?? "var(--color-warm)") }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{t.title}</p>
                      <p className="text-[11px] truncate" style={{ color: t.is_legend_unlock ? "#F472B6" : "var(--color-muted)" }}>{t.group_name}</p>
                    </div>
                    {isEquipped && <Check size={15} strokeWidth={2} className="flex-shrink-0" style={{ color: t.is_legend_unlock ? "#F472B6" : "var(--color-warm)" }} />}
                  </button>
                );
              })}
              <p className="text-[11px] text-[var(--color-muted)] mt-1">
                Toca tu título para mostrarlo u ocultarlo en tu tarjeta.
              </p>
            </div>
          </>
        )}

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
                <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
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
            <div className="mb-5 divide-border">
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
        <div className="bg-[var(--color-bg-card)] rounded-[16px] px-4 divide-border mb-4">
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
          <button
            onClick={() => setShowPreferences(true)}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <SlidersHorizontal size={17} strokeWidth={1.5} className="text-warm" />
            <span className="text-[13px] flex-1">Preferencias</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          </button>
          <button
            onClick={() => setShowLanguage(true)}
            className="w-full flex items-center gap-3 py-3 text-left"
          >
            <Globe size={17} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            <span className="text-[13px] flex-1">Idioma</span>
            <span className="text-[12px] text-[var(--color-muted)] mr-1">Español</span>
            <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          </button>
        </div>

        {/* Cuenta */}
        <p className="text-[13px] text-[var(--color-muted)] mb-2.5">Cuenta</p>
        <div className="bg-[var(--color-bg-card)] rounded-[16px] px-4 divide-border mb-4">
          <div className="flex items-center gap-3 py-3">
            <div className="w-[17px] h-[17px] flex-shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px]">Cuenta de Google</p>
              <p className="text-[11px] text-[var(--color-muted)] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 py-3 text-left">
            <LogOut size={17} strokeWidth={1.5} className="text-accent" />
            <span className="text-[13px] text-accent">Cerrar sesión</span>
          </button>
        </div>

        {/* Zona de peligro */}
        <p className="text-[13px] mb-2.5" style={{ color: "#ef4444" }}>Zona de peligro</p>
        <div className="rounded-[16px] px-4 mb-8" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-full flex items-center gap-3 py-3.5 text-left"
          >
            <Trash2 size={17} strokeWidth={1.5} style={{ color: "#ef4444" }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px]" style={{ color: "#ef4444" }}>Eliminar cuenta</p>
              <p className="text-[11px] text-[var(--color-muted)]">Borra todos tus datos permanentemente</p>
            </div>
            <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#ef4444" }} />
          </button>
        </div>
      </div>

      {/* Toast: título actualizado */}
      {titleToast && (
        <div className="fixed bottom-[88px] left-4 right-4 z-[90] flex justify-center pointer-events-none">
          <div className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-xl" style={{ background: "#14532d", border: "1px solid rgba(34,197,94,0.5)" }}>
            <Check size={14} strokeWidth={2} style={{ color: "#22c55e" }} className="flex-shrink-0" />
            <p className="text-[13px] text-[var(--color-fg)]">Título actualizado</p>
          </div>
        </div>
      )}

      {/* Edit name drawer */}
      <EditNameDrawer
        open={showEditName}
        current={displayName}
        onSave={saveName}
        onClose={() => setShowEditName(false)}
      />

      {/* Preferences drawer */}
      <PreferencesDrawer
        open={showPreferences}
        currentGender={profile?.gender ?? null}
        onSave={savePreferences}
        onClose={() => setShowPreferences(false)}
      />

      {/* Language drawer */}
      <LanguageDrawer
        open={showLanguage}
        onClose={() => setShowLanguage(false)}
      />

      {/* Delete account drawer */}
      <DeleteAccountDrawer
        open={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* Notif help modal */}
      {showNotifHelp && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-black/75 backdrop-blur-sm" onClick={() => setShowNotifHelp(false)}>
          <div className="w-full max-w-sm rounded-[24px] p-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-medium text-[18px]">Activar notificaciones</span>
              <button onClick={() => setShowNotifHelp(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)]" style={{ background: "var(--color-surface)" }}>
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
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] text-warm flex-shrink-0 mt-0.5 font-medium" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>{i + 1}</span>
                  <span className="text-[13px] leading-snug">{step}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => setShowNotifHelp(false)} className="w-full py-3 rounded-full text-[13px] text-[var(--color-muted)]" style={{ background: "var(--color-surface)" }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}
