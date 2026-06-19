"use client";

import { Home, CheckSquare, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/dashboard", Icon: Home, label: "Inicio" },
  { href: "/checklist", Icon: CheckSquare, label: "Checklist" },
  { href: "/grupo", Icon: Users, label: "Grupo" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  function NavIcon({
    href,
    label,
    children,
  }: {
    href: string;
    label: string;
    children: React.ReactNode;
  }) {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-label={label}
        className="flex flex-col items-center gap-[3px] relative p-2 transition-transform"
        style={{ transform: isActive ? "translateY(-5px)" : "none" }}
      >
        {children}
        {isActive && (
          <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-warm" />
        )}
      </Link>
    );
  }

  // Insertar el "+" en el medio
  const leftLinks = NAV_LINKS.slice(0, 2);
  const rightLinks = NAV_LINKS.slice(2);

  return (
    <>
      {/* Nav flotante — pill delgada y alargada */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 h-[52px] w-fit min-w-[240px] bg-[#0c0c0c] border border-[#1c1c1c] rounded-pill flex items-center justify-center gap-1 px-4">
        {leftLinks.map(({ href, Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <NavIcon key={href} href={href} label={label}>
              <Icon
                size={20}
                strokeWidth={1.5}
                className={isActive ? "text-warm" : "text-[var(--color-muted)]"}
              />
            </NavIcon>
          );
        })}

        {/* Botón "+" central */}
        <button
          onClick={() => setSheetOpen(true)}
          aria-label="Subir evidencia"
          className="flex items-center justify-center p-2"
        >
          <Plus size={21} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </button>

        {rightLinks.map(({ href, Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <NavIcon key={href} href={href} label={label}>
              <Icon
                size={20}
                strokeWidth={1.5}
                className={isActive ? "text-warm" : "text-[var(--color-muted)]"}
              />
            </NavIcon>
          );
        })}
      </nav>

      {/* Bottom sheet de subida rápida (PROMPT 6) */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-[var(--color-bg-card)] rounded-t-[24px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[#2a2a2a] mx-auto mb-5" />
            <h2 className="font-display font-medium text-lg mb-4">Subir evidencia</h2>
            <p className="text-sm text-[var(--color-muted)]">
              Próximamente: elegir entre Ejercicio, Dieta o Meta diaria.
            </p>
            <button
              onClick={() => setSheetOpen(false)}
              className="mt-6 w-full py-3 rounded-pill bg-accent text-white text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
