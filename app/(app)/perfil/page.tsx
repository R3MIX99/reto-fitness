"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useProfile } from "@/lib/hooks/useProfile";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, Edit } from "lucide-react";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { ThemeSwitch } from "@/components/ui/ThemeSwitch";
import Link from "next/link";

export default function PerfilPage() {
  const { signOut } = useUser();
  const { avatarUrl, displayName, uploadAvatar } = useProfile();
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
    </div>
  );
}
