"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2, Clock, TrendingUp, UserPlus, Users, Bell, X, Trash2 } from "lucide-react";
import { useNotifications, useMarkAllRead, useMarkRead, useDeleteAllNotifications } from "@/lib/hooks/useNotifications";

// ── Config de tipos ────────────────────────────────────────────────────────

type NotifConfig = { Icon: React.ElementType; color: string; bg: string; defaultUrl: string };

function getConfig(type: string, metadata?: Record<string, unknown>): NotifConfig {
  // review_done can be approved or rejected
  if (type === "review_done") {
    const approved = metadata?.approved !== false;
    return approved
      ? { Icon: CheckCircle2, color: "#22c55e", bg: "rgba(34,197,94,0.15)",    defaultUrl: "/checklist" }
      : { Icon: X,            color: "#ef4444", bg: "rgba(239,68,68,0.15)",    defaultUrl: "/checklist" };
  }
  const map: Record<string, NotifConfig> = {
    check_completed: { Icon: CheckCircle2, color: "#EFC88B", bg: "rgba(239,200,139,0.15)", defaultUrl: "/checklist" },
    review_pending:  { Icon: Clock,        color: "#CF5C36", bg: "rgba(207,92,54,0.15)",   defaultUrl: "/auditoria" },
    ranking_passed:  { Icon: TrendingUp,   color: "#CF5C36", bg: "rgba(207,92,54,0.15)",   defaultUrl: "/grupo" },
    new_member:      { Icon: UserPlus,     color: "#EFC88B", bg: "rgba(239,200,139,0.15)", defaultUrl: "/grupo" },
    joined_group:    { Icon: Users,        color: "#EFC88B", bg: "rgba(239,200,139,0.15)", defaultUrl: "/grupo" },
  };
  return map[type] ?? { Icon: Bell, color: "#7C7C7C", bg: "rgba(124,124,124,0.15)", defaultUrl: "/" };
}

// ── Helpers de fecha ───────────────────────────────────────────────────────

const DIAS  = ["dom","lun","mar","mié","jue","vie","sáb"];
const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function calendarDay(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function relativeLabel(dateStr: string): string {
  const now  = new Date();
  const date = new Date(dateStr);
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  const diffH   = Math.floor(diffMin / 60);

  if (diffMin < 1)  return "Ahora";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  // If it's a different calendar day, don't say "Hace X h"
  if (calendarDay(date) !== calendarDay(now)) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (calendarDay(date) === calendarDay(yesterday)) return "Ayer";
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${DIAS[date.getDay()]} ${date.getDate()}`;
    return `${date.getDate()} ${MESES[date.getMonth()]}`;
  }

  return `Hace ${diffH} h`;
}

function groupLabel(dateStr: string): string {
  const now  = new Date();
  const date = new Date(dateStr);

  if (calendarDay(date) === calendarDay(now)) return "Hoy";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (calendarDay(date) === calendarDay(yesterday)) return "Ayer";

  const diffD = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffD < 7) return "Esta semana";
  return "Antes";
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function NotificacionesPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markAllRead = useMarkAllRead();
  const markRead = useMarkRead();
  const deleteAll = useDeleteAllNotifications();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Group by section
  const sections: { label: string; items: typeof notifications }[] = [];
  for (const n of notifications) {
    const label = groupLabel(n.created_at);
    const existing = sections.find((s) => s.label === label);
    if (existing) existing.items.push(n);
    else sections.push({ label, items: [n] });
  }

  function handleTap(n: (typeof notifications)[0]) {
    if (!n.read) markRead.mutate(n.id);
    const cfg = getConfig(n.type, n.metadata);
    const url = (n.metadata?.url as string | undefined) ?? cfg.defaultUrl;
    router.push(url);
  }

  function handleDeleteAll() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      // Auto-cancel confirm state after 3 s if user doesn't tap again
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteAll.mutate(undefined, { onSuccess: () => setConfirmDelete(false) });
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header — sticky */}
      <div
        className="sticky top-0 z-10 flex items-center gap-2 px-[18px] py-3"
        style={{ background: "var(--color-bg)", backdropFilter: "blur(8px)" }}
      >
        <button onClick={() => router.back()} aria-label="Volver" className="flex-shrink-0">
          <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        </button>
        <span className="text-[15px] font-medium flex-1">Notificaciones</span>

        {/* Mark all read (only when unread) */}
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="text-[12px] text-warm font-medium mr-2"
          >
            Leer todas
          </button>
        )}

        {/* Delete all button */}
        {(notifications.length > 0 || deleteAll.isPending) && (
          <button
            onClick={handleDeleteAll}
            disabled={deleteAll.isPending}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-60"
            style={{
              background: confirmDelete ? "rgba(239,68,68,0.18)" : "rgba(124,124,124,0.12)",
              color: confirmDelete ? "#ef4444" : "var(--color-muted)",
            }}
          >
            {deleteAll.isPending ? (
              <>
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Borrando…
              </>
            ) : (
              <>
                <Trash2 size={13} strokeWidth={1.6} />
                {confirmDelete ? "Confirmar" : "Limpiar"}
              </>
            )}
          </button>
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
                const cfg = getConfig(n.type, n.metadata);
                const { Icon } = cfg;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleTap(n)}
                    className="w-full flex items-start gap-3 bg-[var(--color-bg-card)] rounded-[16px] px-4 py-3.5 text-left active:opacity-75 transition-opacity"
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
