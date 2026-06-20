"use client";

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, X, Check, Dumbbell, UtensilsCrossed, Target, ImageIcon } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import { createClient } from "@/lib/supabase/client";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { usePendingChecks, useAuditCheck, useAutoApproveOldChecks, kindLabel, getWeekNumber } from "@/lib/hooks/useAuditoria";
import { useUser } from "@/lib/hooks/useUser";

// ── Helpers ────────────────────────────────────────────────────────────────

const DIAS_LARGOS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES_LARGOS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES_LARGOS[d.getMonth()]}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function KindBadge({ kind }: { kind: string }) {
  if (kind === "gym") return (
    <span className="flex items-center gap-1.5 text-[11px] text-accent border border-accent/40 rounded-full px-2.5 py-0.5">
      <Dumbbell size={11} strokeWidth={1.5} /> Gimnasio
    </span>
  );
  if (kind === "diet") return (
    <span className="flex items-center gap-1.5 text-[11px] text-warm border border-warm/30 rounded-full px-2.5 py-0.5">
      <UtensilsCrossed size={11} strokeWidth={1.5} /> Dieta
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] border border-[#2a2a2a] rounded-full px-2.5 py-0.5">
      <Target size={11} strokeWidth={1.5} /> Meta
    </span>
  );
}

// ── Evidence image with signed URL ─────────────────────────────────────────

function EvidenceImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  if (!url && !error) {
    const supabase = createClient();
    supabase.storage
      .from("evidencias")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
        else setError(true);
      });
  }

  if (error || (!url)) {
    return (
      <div className="w-full h-[180px] rounded-[14px] bg-[#1a1a1a] flex flex-col items-center justify-center gap-2">
        <ImageIcon size={30} strokeWidth={1} className="text-[#3f3f3f]" />
        <span className="text-[11px] text-[#555]">{error ? "No se pudo cargar" : "Cargando…"}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[180px] rounded-[14px] overflow-hidden bg-[#1a1a1a]">
      <Image src={url} alt="Evidencia" fill className="object-cover" unoptimized />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const groupIds = groups.map((g) => g.id);

  const { data: checks = [], isLoading } = usePendingChecks(groupIds);
  const audit = useAuditCheck();
  const autoApprove = useAutoApproveOldChecks(groupIds);

  const [auditedIds, setAuditedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<"approved" | "rejected" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Auto-approve pending checks from previous weeks on page open
  useEffect(() => {
    if (groupIds.length) autoApprove.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIds.join(",")]);

  // Filter out already-audited checks immediately (don't wait for refetch)
  const remaining = checks.filter((c) => !auditedIds.has(c.id));
  const current = remaining[0] ?? null;
  const week = getWeekNumber();

  // Redirect when all done
  useEffect(() => {
    if (!isLoading && checks.length > 0 && remaining.length === 0) {
      router.push("/grupo");
    }
  }, [isLoading, checks.length, remaining.length, router]);

  async function handleAudit(approved: boolean, reason?: string) {
    if (!current) return;
    // Optimistically remove from list immediately
    setAuditedIds((prev) => { const s = new Set(prev); s.add(current.id); return s; });
    setRejectOpen(false);
    setRejectReason("");
    setToast(approved ? "approved" : "rejected");
    setTimeout(() => setToast(null), 2500);
    await audit.mutateAsync({
      checkId: current.id,
      approved,
      reason: reason ?? null,
      checkUserId: current.user_id,
      checkDate: current.check_date,
      checkGroupId: current.group_id,
      checkKind: current.kind,
      reviewerName: (user as { user_metadata?: { full_name?: string } } | null)?.user_metadata?.full_name ?? null,
    });
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="px-4 pt-4 pb-28 space-y-3 animate-pulse">
        <div className="h-5 w-32 bg-[var(--color-bg-card)] rounded-full" />
        <div className="h-[320px] bg-[var(--color-bg-card)] rounded-[20px]" />
      </div>
    );
  }

  if (!checks.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] px-8 text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center">
          <Check size={24} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </div>
        <p className="font-display font-medium text-[17px]">Todo revisado</p>
        <p className="text-[13px] text-[var(--color-muted)]">No hay evidencias pendientes de tus compañeros.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 text-[13px] text-[var(--color-muted)] underline underline-offset-2"
        >
          Volver
        </button>
      </div>
    );
  }

  const total = checks.length;
  const done = auditedIds.size;

  return (
    <>
    <div className="px-4 pt-2 pb-28">

      {/* Header nav */}
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center">
          <ChevronLeft size={22} strokeWidth={1.5} />
        </button>
        <span className="font-medium text-[15px]">Auditoría</span>
        <span className="text-[12px] text-[var(--color-muted)]">{done + 1} / {total}</span>
      </div>

      {/* Subtitle + progress */}
      <p className="text-[12px] text-[var(--color-muted)] mb-3">
        Semana {week} · valida las evidencias de tus amigos
      </p>

      <div className="flex gap-1.5 mb-4">
        {checks.map((c, i) => (
          <div
            key={c.id}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{ background: auditedIds.has(c.id) ? "#EFC88B" : "#2a2a2a" }}
          />
        ))}
      </div>

      {/* Main card */}
      {current && (
        <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4 mb-5">
          {/* User info */}
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-medium flex-shrink-0"
              style={{ background: "#2b2b2b", color: "#EEE5E9" }}
            >
              {getInitials(current.full_name)}
            </div>
            <span className="font-medium text-[15px]">{current.full_name ?? "—"}</span>
          </div>

          {/* Date + kind + goal title */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] text-[var(--color-muted)] capitalize">
              {formatDate(current.check_date)}
            </span>
            <KindBadge kind={current.kind} />
            {current.kind !== "gym" && current.goal_title && (
              <span className="text-[12px] font-medium text-[var(--color-fg)]">
                · {current.goal_title}
              </span>
            )}
          </div>

          {/* Evidence photo */}
          <EvidenceImage path={current.evidence_path} />

          {/* Question */}
          <p className="text-[12px] text-[#cfcfcf] text-center mt-3.5 mb-3">¿Cumplió con esta meta?</p>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={() => setRejectOpen(true)}
              disabled={audit.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 text-[13px] border border-[#3a3a3a] rounded-[13px] py-3 transition-opacity disabled:opacity-40"
            >
              <X size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
              Rechazar
            </button>
            <button
              onClick={() => handleAudit(true)}
              disabled={audit.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 text-[13px] bg-accent text-[#4A1B0C] font-medium rounded-[13px] py-3 transition-opacity disabled:opacity-40"
            >
              <Check size={16} strokeWidth={2} />
              Aprobar
            </button>
          </div>
        </div>
      )}

      {/* Queue preview */}
      {remaining.slice(1).length > 0 && (
        <>
          <p className="text-[12px] text-[var(--color-muted)] mb-2.5">Siguientes</p>
          <div className="flex flex-col gap-2 opacity-70">
            {remaining.slice(1, 4).map((c) => (
              <div key={c.id} className="flex items-center gap-2.5 bg-[var(--color-bg-card)] rounded-[13px] px-3.5 py-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                  style={{ background: "#2b2b2b", color: "#EEE5E9" }}
                >
                  {getInitials(c.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] truncate block">{c.full_name ?? "—"}</span>
                  {c.kind !== "gym" && c.goal_title && (
                    <span className="text-[11px] text-[var(--color-muted)] truncate block">{c.goal_title}</span>
                  )}
                </div>
                <KindBadge kind={c.kind} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>

    {/* Drawer: razón de rechazo */}
    <VaulDrawer.Root open={rejectOpen} onOpenChange={(o) => !o && setRejectOpen(false)}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 bg-black/60 z-[70]" />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[80] bg-[#0e0e0e] rounded-t-[26px] outline-none flex flex-col">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
          </div>
          <div className="px-5 pb-8">
            <p className="font-display font-medium text-[17px] mb-1">Rechazar evidencia</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-4">Escribe el motivo del rechazo (opcional)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: La foto no muestra claramente el ejercicio…"
              rows={3}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-[14px] px-4 py-3 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none resize-none mb-4"
            />
            <button
              onClick={() => handleAudit(false, rejectReason || undefined)}
              disabled={audit.isPending}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full py-3.5 text-[14px] font-medium disabled:opacity-50"
            >
              <X size={15} strokeWidth={1.5} />
              {audit.isPending ? "Rechazando…" : "Confirmar rechazo"}
            </button>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>

    {/* Toast */}
    {toast && (
      <div className="fixed bottom-[88px] left-4 right-4 z-[90] flex justify-center pointer-events-none">
        <div
          className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-lg"
          style={{
            background: toast === "approved" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: toast === "approved" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(239,68,68,0.4)",
          }}
        >
          {toast === "approved"
            ? <Check size={14} strokeWidth={2} style={{ color: "#22c55e" }} className="flex-shrink-0" />
            : <X size={14} strokeWidth={2} style={{ color: "#ef4444" }} className="flex-shrink-0" />
          }
          <p className="text-[13px] text-[var(--color-fg)]">
            {toast === "approved" ? "Evidencia aprobada" : "Evidencia rechazada"}
          </p>
        </div>
      </div>
    )}
    </>
  );
}
