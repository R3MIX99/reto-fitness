"use client";

import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import { LogOut, ChevronLeft, Edit } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function PerfilPage() {
  const { user, signOut } = useUser();
  const router = useRouter();
  const fullName = user?.user_metadata?.full_name ?? user?.email ?? "Usuario";
  const avatarUrl = user?.user_metadata?.avatar_url;

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
        {/* Hero */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <div className="relative w-[74px] h-[74px] mb-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName}
                width={74}
                height={74}
                className="rounded-full border-2 border-[#2a2a2a] object-cover"
              />
            ) : (
              <div className="w-[74px] h-[74px] rounded-full bg-accent border-2 border-[#2a2a2a] flex items-center justify-center text-accent-dark font-medium text-2xl">
                {getInitials(user?.user_metadata?.full_name)}
              </div>
            )}
            <div className="absolute right-[-2px] bottom-[-2px] w-[26px] h-[26px] rounded-full bg-warm border-2 border-[var(--color-bg)] flex items-center justify-center">
              <Edit size={12} strokeWidth={2} className="text-accent-dark" />
            </div>
          </div>
          <div className="font-display font-medium text-[20px]">{fullName}</div>
          <div className="text-xs text-[var(--color-muted)] mt-1">{user?.email}</div>
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
              <span className="text-[13px] text-[var(--color-muted)]">Oscuro</span>
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
