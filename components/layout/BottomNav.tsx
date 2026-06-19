"use client";

import { Home, CheckSquare, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Inicio" },
  { href: "/checklist", icon: CheckSquare, label: "Checklist" },
  { href: null, icon: Plus, label: "Subir evidencia", isAction: true },
  { href: "/grupo", icon: Users, label: "Grupo" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      {/* Nav flotante */}
      <nav className="fixed bottom-3 left-3 right-3 z-30 h-[46px] bg-[#0c0c0c] border border-[#1c1c1c] rounded-pill flex items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href ? pathname.startsWith(item.href) : false;
          const Icon = item.icon;

          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={() => setSheetOpen(true)}
                aria-label={item.label}
                className="flex flex-col items-center gap-[3px] relative p-2"
              >
                <Icon
                  size={21}
                  strokeWidth={1.5}
                  className="text-[var(--color-muted)]"
                />
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              aria-label={item.label}
              className="flex flex-col items-center gap-[3px] relative p-2"
              style={{ transform: isActive ? "translateY(-5px)" : "none" }}
            >
              <Icon
                size={20}
                strokeWidth={1.5}
                className={isActive ? "text-warm" : "text-[var(--color-muted)]"}
              />
              {isActive && (
                <span className="absolute bottom-[-2px] w-1 h-1 rounded-full bg-warm" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom sheet placeholder (PROMPT 6) */}
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
              (PROMPT 6 — Elegir categoría: Ejercicio, Dieta o Meta diaria)
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
