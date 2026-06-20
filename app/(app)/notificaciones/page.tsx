"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock, Trophy, UserPlus, Users, TrendingUp, Bell } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkRead } from "@/lib/hooks/useNotifications";

// ── Config de tipos ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  check_completed: { Icon: CheckCircle2, color: "#EFC88B", bg: "rgba(239,200,139,0.15)" },
  review_pending:  { Icon: Clock,        color: "#CF5C36", bg: "rgba(207,92,54,0.15)"  },
  review_done:     { Icon: CheckCircle2, color: "#EFC88B", bg: "rgba(239,200,139,0.15)" },
  ranking_passed:  { Icon: TrendingUp,   color: "#CF5C36", bg: "rgba(207,92,54,0.15)"  },
  new_member:      { Icon: UserPlus,     color: "#EFC88B", bg: "rgba(239,200,139,0.15)" },
  joined_group:    { Icon: Users,        color: "#EFC88B", bg: "rgba(239,200,139,0.15)" },
};

const FALLBACK = { Icon: Bell, color: "#7C7C7C", bg: "rgba(124,124,124,0.15)" };

// ── Helpers de fecha ───────────────────────────────────────────────────────

const DIAS   = ["dom","lun","mar","mié","jue","vie","sáb"];
const MESES  = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function relativeLabel(dateStr: string): string {
  const now  = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);

  if (diffMin < 1)  return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH   < 24) return `Hace ${diffH} h`;
  if (diffD   === 1) return "Ayer";
  if (diffD   < 7)  return `${DIAS[date.getDay()]} ${date.getDate()}`;
  return `${date.getDate()} ${MESES[date.getMonth()]}`;
}

function groupLabel(dateStr: string): string {
  const now  = new Date();
  const date = new Date(dateStr);
  const diffD = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffD === 0) return "Hoy";
  if (diffD === 1) return "Ayer";
  if (diffD  < 7) return "Esta semana";
  return "Antes";
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group by section
  const sections: { label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const label = groupLabel(n.created_at);
    const existing = sections.find((s) => s.label === label);
    if (existing) existing.items.push(n);
    else sections.push({ label, items: [n] });
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-[18px] py-3">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        </button>
        <span className="text-[15px] font-medium">Notificaciones</span>
        {unreadCount > 0 ? (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-[12px] text-warm font-medium"
          >
            Leer todas
          </button>
        ) : (
          <div className="w-[70px]" />
        )}
      </div>

      {/* Content */}
      <div className="px-4">
        {isLoading && (
          <div className="space-y-3 animate-pulse pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[68px] bg-[var(--color-bg-card)] rounded-[16px]" />
            ))}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center">
              <Bell size={22} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[15px] font-medium">Sin notificaciones</p>
            <p className="text-[13px] text-[var(--color-muted)]">Aquí aparecerán tus avisos de actividad.</p>
          </div>
        )}

        {sections.map(({ label, items }) => (
          <div key={label} className="mb-5">
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-2.5">{label}</p>
            <div className="space-y-2">
              {items.map((n) => {
                const cfg = TYPE_CONFIG[n.type] ?? FALLBACK;
                const { Icon } = cfg;
                return (
                  <button
                    key={n.id}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className="w-full flex items-start gap-3 bg-[var(--color-bg-card)] rounded-[16px] px-4 py-3.5 text-left"
                    style={{ opacity: n.read ? 0.6 : 1 }}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: cfg.bg }}
                    >
                      <Icon size={18} strokeWidth={1.5} style={{ color: cfg.color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-[11px] text-[var(--color-muted)] mt-0.5 leading-snug">{n.body}</p>
                      )}
                      <p className="text-[11px] text-[var(--color-muted)] mt-1">{relativeLabel(n.created_at)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
