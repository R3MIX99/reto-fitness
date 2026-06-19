"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import Image from "next/image";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días,";
  if (h >= 12 && h < 19) return "Buenas tardes,";
  return "Buenas noches,";
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

interface HeaderProps {
  hasNotifications?: boolean;
}

export function Header({ hasNotifications = false }: HeaderProps) {
  const { user } = useUser();
  const greeting = getGreeting();
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Tú";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="relative z-10 flex items-center gap-3 px-[18px] py-3">
      {/* Avatar — abre perfil */}
      <Link href="/perfil" aria-label="Ver perfil">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={firstName}
            width={44}
            height={44}
            className="w-11 h-11 rounded-full border-2 border-[#2a2a2a] object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-accent border-2 border-[#2a2a2a] flex items-center justify-center text-accent-dark font-medium text-[15px] flex-shrink-0">
            {getInitials(user?.user_metadata?.full_name)}
          </div>
        )}
      </Link>

      {/* Saludo */}
      <div className="flex-1 leading-[1.15]">
        <div className="text-[13px] text-[var(--color-muted)]">{greeting}</div>
        <div className="font-display font-medium text-[22px] text-[var(--color-fg)]">
          {firstName}<span className="text-warm">.</span>
        </div>
      </div>

      {/* Campana */}
      <div className="relative w-[38px] h-[38px] rounded-full bg-[var(--color-bg-card)] flex items-center justify-center flex-shrink-0">
        <Bell size={18} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        {hasNotifications && (
          <span className="absolute top-[9px] right-[9px] w-[7px] h-[7px] rounded-full bg-accent border-[1.5px] border-[var(--color-bg-card)]" />
        )}
      </div>
    </header>
  );
}
