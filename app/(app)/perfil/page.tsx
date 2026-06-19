"use client";

import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, Edit, Bell, BellOff, X } from "lucide-react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import Link from "next/link";

export default function PerfilPage() {
  const { signOut } = useUser();
  const { avatarUrl, displayName, uploadAvatar } = useProfile();
  const { data: groups = [] } = useMyGroups();
  const groupId = groups[0]?.id ?? null;
  const { state: pushState, loading: pushLoading, error: pushError, subscribe } = usePushNotifications(groupId);
  const [showNotifHelp, setShowNotifHelp] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="pb-28">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-[18px] py-3">
        <Link href="/dashboard" aria-label="Volver">
          <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        </Link>
        <span className="text-[15px] font-medium">Perfil</span>
        <Edit size={19} strokeWidth={1.5} className="text-[var(--color-muted)]" />
      </div>

      <div className="px-4 space-y-5">
        {/* Hero con avatar editable */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <AvatarUpload
            avatarUrl={avatarUrl}
            displayName={displayName}
            size={74}
            onUpload={uploadAvatar}
          />
          <div className="font-display font-medium text-[20px] mt-3">{displayName}</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">Los Más Fuertes <span className="text-warm">· 1ero</span></div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="flex gap-2">
          {[
            { label: "Títulos", value: "0" },
            { label: "Mejor racha", value: "0" },
            { label: "Puntos", value: "0" },
          ].map(({ label, value }) => (
            <div key={label} className="flex-1 bg-[var(--color-bg-card)] rounded-[14px] p-3 text-center">
              <div className="font-display font-medium text-[17px]">{value}</div>
              <div className="text-[10px] text-[var(--color-muted)] mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Ajustes */}
        <div>
          <p className="text-[13px] text-[var(--color-muted)] mb-3">Ajustes</p>
          <div className="bg-[var(--color-bg-card)] rounded-[16px] overflow-hidden divide-y divide-[#1c1c1c]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px]">Tema</span>
              <ThemeSwitch />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px]">Idioma</span>
              <span className="text-[13px] text-[var(--color-muted)]">Español</span>
            </div>
            {pushState !== "unsupported" && (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-[13px]">Notificaciones</span>
                  {pushState === "granted" ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-warm">
                      <Bell size={13} strokeWidth={1.5} /> Activas
                    </span>
                  ) : pushState === "denied" ? (
                    <button
                      onClick={() => setShowNotifHelp(true)}
                      className="flex items-center gap-1.5 text-[12px] text-accent font-medium"
                    >
                      <BellOff size={13} strokeWidth={1.5} /> Activar
                    </button>
                  ) : (
                    <button
                      onClick={subscribe}
                      disabled={pushLoading}
                      className="text-[12px] text-accent font-medium disabled:opacity-50"
                    >
                      {pushLoading ? "Activando…" : "Activar"}
                    </button>
                  )}
                </div>
                {pushError && (
                  <div className="px-4 py-2">
                    <p className="text-[11px] text-red-400">{pushError}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Cuenta */}
        <div>
          <p className="text-[13px] text-[var(--color-muted)] mb-3">Cuenta</p>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 bg-[var(--color-bg-card)] rounded-[16px] px-4 py-3 text-accent text-[13px]"
          >
            <LogOut size={16} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Modal: instrucciones para activar notificaciones bloqueadas */}
      {showNotifHelp && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowNotifHelp(false)}
        >
          <div
            className="w-full max-w-sm bg-[#0e0e0e] border border-[#1f1f1f] rounded-[24px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-medium text-[18px]">Activar notificaciones</span>
              <button
                onClick={() => setShowNotifHelp(false)}
                className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[var(--color-muted)]"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[13px] text-[var(--color-muted)] mb-6">
              Las notificaciones están bloqueadas. Sigue estos pasos para activarlas:
            </p>

            <ol className="space-y-4">
              {[
                'Toca el ícono 🔒 en la barra de dirección del navegador.',
                'Selecciona "Permisos" o "Configuración del sitio".',
                'Busca "Notificaciones" y cámbialo a "Permitir".',
                "Recarga la página y toca Activar de nuevo.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-[11px] text-warm flex-shrink-0 mt-0.5 font-medium">
                    {i + 1}
                  </span>
                  <span className="text-[13px] leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={() => setShowNotifHelp(false)}
              className="mt-7 w-full py-3 rounded-full bg-[#1a1a1a] text-[13px] text-[var(--color-muted)]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
