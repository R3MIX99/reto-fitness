"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

// Rutas utilizables sin conexión. El resto (grupos, ligas, dashboard, perfil…)
// dependen del servidor, así que offline muestran un aviso en vez del contenido.
const OFFLINE_ROUTES = ["/checklist"];

export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const online = useOnlineStatus();
  const pathname = usePathname();

  const allowed = OFFLINE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  if (online || allowed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-5 px-8 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-bg-card)]">
        <CloudOff className="h-7 w-7 text-[var(--color-muted)]" strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-xl text-[var(--color-fg)]">Sin conexión</h2>
        <p className="max-w-xs text-sm text-[var(--color-muted)]">
          Esta sección necesita internet. Mientras tanto puedes seguir marcando
          tus metas en el checklist: se enviarán cuando vuelvas a estar en línea.
        </p>
      </div>
      <Link
        href="/checklist"
        className="rounded-pill bg-accent px-6 py-3 text-[14px] font-medium text-white transition-opacity active:opacity-75"
      >
        Ir al checklist
      </Link>
    </div>
  );
}
