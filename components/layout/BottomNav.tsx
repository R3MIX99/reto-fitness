"use client";

import { Home, CheckSquare, Plus, Users, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { EvidenciaSheet } from "@/components/ui/EvidenciaSheet";

const NAV_LINKS = [
  { href: "/dashboard",       Icon: Home,          label: "Inicio"     },
  { href: "/checklist",       Icon: CheckSquare,   label: "Checklist"  },
  { href: "/grupo",           Icon: Users,         label: "Grupo"      },
  { href: "/mis-auditorias",  Icon: ClipboardList, label: "Auditorías" },
] as const;

const LEFT  = NAV_LINKS.slice(0, 2);
const RIGHT = NAV_LINKS.slice(2);

export function BottomNav() {
  const pathname   = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (pathname === "/perfil" || pathname === "/notificaciones") return null;

  return (
    <>
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 h-[56px] w-fit min-w-[260px] rounded-full flex items-center justify-center gap-1 px-3" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        {LEFT.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="relative flex flex-col items-center justify-center w-11 h-11 rounded-full transition-transform"
              style={{ transform: active ? "translateY(-4px)" : "none" }}
            >
              <Icon size={20} strokeWidth={1.5} style={{ color: active ? "#EFC88B" : "#7C7C7C" }} />
              {active && <span className="absolute bottom-[3px] w-1 h-1 rounded-full bg-warm" />}
            </Link>
          );
        })}

        {/* Botón "+" central */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Subir evidencia"
          className="mx-1 w-11 h-11 flex items-center justify-center transition-transform active:scale-95"
        >
          <Plus size={20} strokeWidth={1.5} style={{ color: "#7C7C7C" }} />
        </button>

        {RIGHT.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              data-tour={href === "/mis-auditorias" ? "nav-audit" : undefined}
              className="relative flex flex-col items-center justify-center w-11 h-11 rounded-full transition-transform"
              style={{ transform: active ? "translateY(-4px)" : "none" }}
            >
              <Icon size={20} strokeWidth={1.5} style={{ color: active ? "#EFC88B" : "#7C7C7C" }} />
              {active && <span className="absolute bottom-[3px] w-1 h-1 rounded-full bg-warm" />}
            </Link>
          );
        })}
      </nav>

      <EvidenciaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
