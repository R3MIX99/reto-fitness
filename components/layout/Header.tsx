"use client";

import { Bell } from "lucide-react";
import Link from "next/link";

// Saludo según la hora del dispositivo
function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días,";
  if (h >= 12 && h < 19) return "Buenas tardes,";
  return "Buenas noches,";
}

interface HeaderProps {
  userName?: string;
  hasNotifications?: boolean;
}

export function Header({ userName = "Andre", hasNotifications = true }: HeaderProps) {
  const greeting = getGreeting();

  return (
    <header className="relative z-10 flex items-center gap-3 px-[18px] py-3">
      {/* Avatar — abre perfil */}
      <Link href="/perfil" aria-label="Ver perfil">
        <div className="w-11 h-11 rounded-full bg-accent border-2 border-[#2a2a2a] flex items-center justify-center text-accent-dark font-medium text-[15px] flex-shrink-0">
          {userName.slice(0, 2).toUpperCase()}
        </div>
      </Link>

      {/* Saludo */}
      <div className="flex-1 leading-[1.15]">
        <div className="text-[13px] text-[var(--color-muted)]">{greeting}</div>
        <div className="font-display font-medium text-[22px] text-[var(--color-fg)]">
          {userName}<span className="text-warm">.</span>
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
