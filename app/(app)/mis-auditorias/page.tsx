"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Check, X, Clock, Dumbbell, UtensilsCrossed,
  Target, ImageIcon, RefreshCw, ChevronDown, ChevronUp, Video as VideoIcon, Archive, Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMyAudits, type MyAuditEntry } from "@/lib/hooks/useMyAudits";
import { useAuditCheck } from "@/lib/hooks/useAuditoria";
import { useUser } from "@/lib/hooks/useUser";
import { isVideoPath } from "@/lib/hooks/useChecklist";
import { auditWindowClosed } from "@/lib/auditWindow";

// ── Helpers ────────────────────────────────────────────────────────────────

const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function KindBadge({ kind }: { kind: string }) {
  if (kind === "gym") return (
    <span className="flex items-center gap-1 text-[11px] text-accent border border-accent/40 rounded-full px-2 py-0.5">
      <Dumbbell size={10} strokeWidth={1.5} /> Gimnasio
    </span>
  );
  if (kind === "diet") return (
    <span className="flex items-center gap-1 text-[11px] text-warm border border-warm/30 rounded-full px-2 py-0.5">
      <UtensilsCrossed size={10} strokeWidth={1.5} /> Dieta
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] rounded-full px-2 py-0.5" style={{ border: "1px solid var(--color-border)" }}>
      <Target size={10} strokeWidth={1.5} /> Meta
    </span>
  );
}

function EvidenceThumb({ path, purged }: { path: string; purged?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (purged || !path) return;
    setUrl(null);
    setErrored(false);
    createClient()
      .storage.from("evidencias")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
        else setErrored(true);
      });
  }, [path, purged]);

  if (purged) {
    return (
      <div className="w-[72px] h-[72px] flex-shrink-0 rounded-[12px] flex flex-col items-center justify-center gap-1" style={{ background: "var(--color-surface)" }}>
        <Archive size={18} strokeWidth={1.25} className="text-[var(--color-muted)]" />
        <span className="text-[9px] text-[var(--color-muted)] text-center leading-tight">Archivada</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="w-[72px] h-[72px] flex-shrink-0 rounded-[12px] flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        {errored
          ? <ImageIcon size={20} strokeWidth={1} className="text-[var(--color-muted)]" />
          : <div className="w-4 h-4 rounded-full border-2 border-t-[var(--color-muted)] animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-muted)" }} />
        }
      </div>
    );
  }

  if (isVideoPath(path)) {
    return (
      <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <video src={url} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-black/45 flex items-center justify-center">
            <VideoIcon size={13} strokeWidth={1.5} className="text-white" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-[72px] h-[72px] flex-shrink-0 rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
      <Image src={url} alt="Evidencia" fill className="object-cover" unoptimized />
    </div>
  );
}

// ── Audit Card ─────────────────────────────────────────────────────────────

function AuditCard({
  entry,
  onApprove,
  onReject,
  pending,
}: {
  entry: MyAuditEntry;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [expanded, setExpanded] = useState(false);

  const isResubmitted = entry.check_status === "pending";
  const isApproved = entry.check_status === "approved";
  // Ventana cerrada (semana + 2 días): decisión bloqueada y evidencia purgada.
  const windowClosed = auditWindowClosed(entry.check_date);
  // Solo se puede cambiar la decisión si: la ventana sigue abierta Y no está ya
  // aprobada (una aprobación es definitiva, no se puede pasar a rechazo).
  const canChange = !windowClosed && !isApproved;

  const subtitle = [formatDate(entry.check_date), entry.goal_title].filter(Boolean).join(" · ");

  return (
    <div className={`bg-[var(--color-bg-card)] rounded-[18px] p-4 ${isResubmitted ? "ring-1 ring-[var(--color-warm)]/30" : ""}`}>
      {/* Header: avatar + name + date + kind */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ background: "var(--color-border)" }}>
          {entry.owner_avatar ? (
            <Image src={entry.owner_avatar} alt={entry.owner_name ?? ""} width={40} height={40} className="object-cover w-full h-full" unoptimized={entry.owner_avatar.includes("?t=")} referrerPolicy="no-referrer" />
          ) : (
            <span className="text-[13px] font-medium text-[var(--color-muted)]">{getInitials(entry.owner_name)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate">{entry.owner_name ?? "Jugador"}</p>
          <p className="text-[12px] text-[var(--color-muted)] truncate">{subtitle}</p>
        </div>
        <KindBadge kind={entry.check_kind} />
      </div>

      {/* Evidence + status row */}
      <div className="flex items-center gap-3">
        <EvidenceThumb path={entry.check_evidence_path} purged={entry.check_evidence_purged} />

        <div className="flex-1 space-y-2">
          {/* Current check status */}
          {isResubmitted ? (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-warm)] bg-[rgba(239,200,139,0.1)] border border-[var(--color-warm)]/20 rounded-full px-2.5 py-1 w-fit">
              <RefreshCw size={10} strokeWidth={1.5} />
              Nueva evidencia — por revisar
            </span>
          ) : isApproved ? (
            <span className="flex items-center gap-1.5 text-[11px] text-green-400 bg-[rgba(34,197,94,0.08)] border border-green-400/20 rounded-full px-2.5 py-1 w-fit">
              <Check size={10} strokeWidth={2} />
              Aprobado por ti
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-red-400 bg-[rgba(239,68,68,0.08)] border border-red-400/20 rounded-full px-2.5 py-1 w-fit">
              <X size={10} strokeWidth={2} />
              Rechazado por ti
            </span>
          )}

          {/* Rejection reason if any */}
          {entry.reason && (
            <p className="text-[11px] text-[var(--color-muted)] italic">&ldquo;{entry.reason}&rdquo;</p>
          )}

          {/* Change decision toggle — solo si la ventana sigue abierta y no está
              ya aprobada (la aprobación es definitiva). */}
          {!isResubmitted && canChange && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              Cambiar decisión
              {expanded ? <ChevronUp size={11} strokeWidth={1.5} /> : <ChevronDown size={11} strokeWidth={1.5} />}
            </button>
          )}

          {/* Bloqueo: ventana cerrada (semana + 2 días) */}
          {windowClosed && (
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
              <Lock size={10} strokeWidth={1.5} />
              Periodo de revisión cerrado
            </span>
          )}
        </div>
      </div>

      {/* Action buttons — shown for re-submitted OR expanded change (solo con ventana abierta) */}
      {(isResubmitted || expanded) && !rejectOpen && !windowClosed && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onApprove}
            disabled={pending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[13px] font-medium rounded-full py-2.5 transition-opacity disabled:opacity-50"
          >
            <Check size={14} strokeWidth={2} />
            Aprobar
          </button>
          <button
            onClick={() => setRejectOpen(true)}
            disabled={pending}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[13px] font-medium rounded-full py-2.5 transition-opacity disabled:opacity-50"
          >
            <X size={14} strokeWidth={2} />
            Rechazar
          </button>
        </div>
      )}

      {/* Reject reason input */}
      {rejectOpen && (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Razón del rechazo (opcional)"
            className="w-full rounded-[12px] px-3 py-2 text-[13px] text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setRejectOpen(false)}
              className="flex-1 text-[12px] text-[var(--color-muted)] rounded-full py-2" style={{ border: "1px solid var(--color-border)" }}
            >
              Cancelar
            </button>
            <button
              onClick={() => { onReject(); setRejectOpen(false); setReason(""); setExpanded(false); }}
              disabled={pending}
              className="flex-1 text-[12px] text-red-400 bg-red-500/10 border border-red-500/30 rounded-full py-2 disabled:opacity-50"
            >
              Confirmar rechazo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MisAuditoriasPage() {
  const router = useRouter();
  const { user } = useUser();
  const { data: entries = [], isLoading } = useMyAudits();
  const audit = useAuditCheck();

  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const resubmitted = entries.filter((e) => e.check_status === "pending");
  const reviewed = entries.filter((e) => e.check_status !== "pending");

  function handleAudit(entry: MyAuditEntry, approved: boolean, reason?: string) {
    audit.mutate({
      checkId: entry.check_id,
      approved,
      reason: reason ?? null,
      checkUserId: entry.owner_id,
      checkDate: entry.check_date,
      checkGroupId: entry.check_group_id,
      checkKind: entry.check_kind,
      checkGoalId: entry.check_goal_id ?? null,
    });
  }

  return (
    <div className="px-4 pt-2 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="font-display font-semibold text-[19px]">Mis auditorías</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[120px] bg-[var(--color-bg-card)] rounded-[18px] animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center">
            <Clock size={24} strokeWidth={1} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-[15px] font-medium">Sin auditorías aún</p>
          <p className="text-[13px] text-[var(--color-muted)]">
            Aquí aparecerán las evidencias que hayas revisado.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Re-submitted section */}
          {resubmitted.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[11px] text-[var(--color-warm)] uppercase tracking-wider font-medium">
                  Nueva evidencia por revisar
                </p>
                <span className="w-5 h-5 rounded-full bg-[var(--color-warm)] flex items-center justify-center text-[10px] font-bold text-black">
                  {resubmitted.length}
                </span>
              </div>
              <div className="space-y-3">
                {resubmitted.map((entry) => (
                  <AuditCard
                    key={entry.check_id}
                    entry={entry}
                    pending={audit.isPending}
                    onApprove={() => handleAudit(entry, true)}
                    onReject={() => handleAudit(entry, false, rejectReason[entry.check_id])}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Reviewed section */}
          {reviewed.length > 0 && (
            <section>
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-medium mb-3">
                Ya revisadas
              </p>
              <div className="space-y-3">
                {reviewed.map((entry) => (
                  <AuditCard
                    key={entry.check_id}
                    entry={entry}
                    pending={audit.isPending}
                    onApprove={() => handleAudit(entry, true)}
                    onReject={() => handleAudit(entry, false, rejectReason[entry.check_id])}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
