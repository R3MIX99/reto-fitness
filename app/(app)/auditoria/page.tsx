"use client";

import { useState, useEffect, Suspense, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, X, Check, Dumbbell, UtensilsCrossed, Target, ImageIcon, Maximize2, ChevronDown, Timer, AlignLeft, Mic, Video } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import { createClient } from "@/lib/supabase/client";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { usePendingChecks, useAuditCheck, useAutoApproveOldChecks, kindLabel, getWeekNumber } from "@/lib/hooks/useAuditoria";
import { useActiveSeason } from "@/lib/hooks/useSeasons";
import { useUser } from "@/lib/hooks/useUser";
import { isVideoPath, type CheckEvidence } from "@/lib/hooks/useChecklist";
import { AudioPlayer } from "@/components/ui/AudioPlayer";

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

// Avatar del jugador con fallback a iniciales. referrerPolicy="no-referrer"
// evita el 403 de Google al cargar la foto directo del navegador.
function UserAvatar({ url, name, size }: { url: string | null; name: string | null; size: number }) {
  if (url) {
    return (
      <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: size, height: size }}>
        <Image
          src={url}
          alt={name ?? ""}
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized={url.includes("?t=")}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-medium"
      style={{ width: size, height: size, background: "var(--color-surface)", color: "var(--color-fg)", fontSize: size * 0.36 }}
    >
      {getInitials(name)}
    </div>
  );
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
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] rounded-full px-2.5 py-0.5" style={{ border: "1px solid var(--color-border)" }}>
      <Target size={11} strokeWidth={1.5} /> Meta
    </span>
  );
}

// ── Helpers de fecha/hora ──────────────────────────────────────────────────

function formatUploadTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "p.m." : "a.m.";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const DIAS = ["dom","lun","mar","mié","jue","vie","sáb"];
  return `${DIAS[d.getDay()]} ${d.getDate()} · ${h12}:${mm} ${ampm}`;
}

// ── Evidence image with signed URL + fullscreen lightbox ───────────────────

function EvidenceImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setUrl(null);
    setError(false);
    const supabase = createClient();
    supabase.storage
      .from("evidencias")
      .createSignedUrl(path, 300)
      .then(({ data }) => {
        if (data?.signedUrl) setUrl(data.signedUrl);
        else setError(true);
      });
  }, [path]);

  if (error || !url) {
    return (
      <div className="w-full h-[260px] rounded-[16px] flex flex-col items-center justify-center gap-2" style={{ background: "var(--color-surface)" }}>
        <ImageIcon size={30} strokeWidth={1} className="text-[var(--color-muted)]" />
        <span className="text-[11px] text-[var(--color-muted)]">{error ? "No se pudo cargar" : "Cargando…"}</span>
      </div>
    );
  }

  if (isVideoPath(path)) {
    return (
      <div className="w-full rounded-[16px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <video controls src={url} className="w-full" style={{ maxHeight: 360 }} />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative w-full h-[260px] rounded-[16px] overflow-hidden cursor-pointer"
        style={{ background: "var(--color-surface)" }}
        onClick={() => setLightbox(true)}
      >
        <Image src={url} alt="Evidencia" fill className="object-cover" unoptimized />
        {/* Expand hint */}
        <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <Maximize2 size={14} strokeWidth={1.5} style={{ color: "#fff" }} />
        </div>
      </div>

      {/* Fullscreen lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.93)" }}
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(false); }}
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center z-10"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <X size={18} strokeWidth={1.5} style={{ color: "#fff" }} />
          </button>
          <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image src={url} alt="Evidencia ampliada" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </>
  );
}

// ── Signed URL bajo demanda (solo se firma cuando enabled) ─────────────────

function useSignedUrl(path: string | null | undefined, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path || !enabled) return;
    let cancelled = false;
    createClient()
      .storage.from("evidencias")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path, enabled]);
  return url;
}

// ── Evidencia personalizada colapsable (metas Pro/Elite) ───────────────────
// Cada módulo (resumen, audio, video, tiempo, foto "después") se muestra como
// una fila plegada; al tocarla se expande con scroll para revisar el contenido.

type EvidenceModule = "summary" | "audio" | "video" | "after" | "timer";

function CollapsibleRow({
  icon, label, defaultOpen = false, children,
}: {
  icon: ReactNode; label: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] text-[var(--color-fg)]">
          <span className="text-[var(--color-muted)]">{icon}</span>
          {label}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className="text-[var(--color-muted)] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 pt-0.5">{children}</div>
      )}
    </div>
  );
}

function EvidenceAudio({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) return <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>;
  return <AudioPlayer url={url} />;
}

function EvidenceVideo({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) return <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>;
  return <video controls src={url} className="w-full rounded-[10px]" style={{ maxHeight: 240 }} />;
}

function EvidenceAfterPhoto({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) {
    return (
      <div className="w-full h-[180px] rounded-[12px] flex items-center justify-center" style={{ background: "var(--color-bg-card)" }}>
        <span className="text-[11px] text-[var(--color-muted)]">Cargando…</span>
      </div>
    );
  }
  return (
    <div className="relative w-full h-[220px] rounded-[12px] overflow-hidden" style={{ background: "var(--color-bg-card)" }}>
      <Image src={url} alt="Después" fill className="object-cover" unoptimized />
    </div>
  );
}

function CustomEvidence({ evidence }: { evidence: CheckEvidence }) {
  // Qué módulos expandidos (para firmar URLs solo al abrir)
  const [opened, setOpened] = useState<Set<EvidenceModule>>(new Set());
  const markOpen = (m: EvidenceModule) => setOpened((prev) => new Set(prev).add(m));

  const hasTimer   = evidence.timer_seconds != null;
  const hasSummary = !!evidence.summary;
  const hasAudio   = !!evidence.audio_path;
  const hasVideo   = !!evidence.video_path;
  const hasAfter   = !!evidence.after_path;

  if (!hasTimer && !hasSummary && !hasAudio && !hasVideo && !hasAfter) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[11px] text-[var(--color-muted)]">Evidencia adicional</p>

      {/* Tiempo: corto, se muestra inline sin colapsar */}
      {hasTimer && (
        <div className="flex items-center justify-between rounded-[12px] px-3.5 py-3 text-[13px]" style={{ background: "var(--color-surface)" }}>
          <span className="flex items-center gap-2 text-[var(--color-fg)]">
            <Timer size={15} strokeWidth={1.5} className="text-[var(--color-muted)]" /> Tiempo
          </span>
          <span className="text-[var(--color-fg)]">
            {Math.floor(evidence.timer_seconds! / 60)} min {evidence.timer_seconds! % 60}s
          </span>
        </div>
      )}

      {hasSummary && (
        <CollapsibleRow icon={<AlignLeft size={15} strokeWidth={1.5} />} label="Resumen">
          <div className="max-h-[200px] overflow-y-auto">
            <p className="text-[13px]" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
              {evidence.summary}
            </p>
          </div>
        </CollapsibleRow>
      )}

      {hasAudio && (
        <div onClick={() => markOpen("audio")}>
          <CollapsibleRow icon={<Mic size={15} strokeWidth={1.5} />} label="Audio">
            <EvidenceAudio path={evidence.audio_path!} enabled={opened.has("audio")} />
          </CollapsibleRow>
        </div>
      )}

      {hasVideo && (
        <div onClick={() => markOpen("video")}>
          <CollapsibleRow icon={<Video size={15} strokeWidth={1.5} />} label="Video">
            <EvidenceVideo path={evidence.video_path!} enabled={opened.has("video")} />
          </CollapsibleRow>
        </div>
      )}

      {hasAfter && (
        <div onClick={() => markOpen("after")}>
          <CollapsibleRow icon={<ImageIcon size={15} strokeWidth={1.5} />} label="Foto después">
            <EvidenceAfterPhoto path={evidence.after_path!} enabled={opened.has("after")} />
          </CollapsibleRow>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AuditoriaPage() {
  return (
    <Suspense fallback={null}>
      <AuditoriaInner />
    </Suspense>
  );
}

function AuditoriaInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  // Si llega ?group=<id> la auditoría se limita a ese grupo (cada grupo es aislado).
  // Sin el parámetro, cae al comportamiento previo (todos los grupos del usuario).
  const groupParam = searchParams.get("group");
  const scopedGroupIds = groupParam
    ? [groupParam]
    : groups.map((g) => g.id);

  const { data: checks = [], isLoading } = usePendingChecks(scopedGroupIds);
  const { data: activeSeason } = useActiveSeason(groupParam);
  const audit = useAuditCheck();
  const autoApprove = useAutoApproveOldChecks(scopedGroupIds);

  function isPreSeason(checkDate: string): boolean {
    if (!activeSeason?.start_date) return false;
    return checkDate < activeSeason.start_date;
  }

  // Clave compuesta user+date+kind+goal — evita el flash cuando el refetch
  // devuelve la fila hermana de otro grupo (mismo check, diferente id).
  const [auditedKeys, setAuditedKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<"approved" | "rejected" | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function evidenceKey(c: { user_id: string; check_date: string; kind: string; goal_id: string | null }) {
    return `${c.user_id}|${c.check_date}|${c.kind}|${c.goal_id ?? ""}`;
  }

  // Auto-approve pending checks from previous weeks on page open
  useEffect(() => {
    if (scopedGroupIds.length) autoApprove.mutate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedGroupIds.join(",")]);

  // Filtrar por clave compuesta, no por id, para excluir filas hermanas del fan-out.
  const remaining = checks.filter((c) => !auditedKeys.has(evidenceKey(c)));
  const current = remaining[0] ?? null;
  const week = getWeekNumber();

  // Redirect when all done — volver al grupo que se estaba revisando
  useEffect(() => {
    if (!isLoading && checks.length > 0 && remaining.length === 0) {
      router.push(groupParam ? `/grupo?joined=${groupParam}` : "/grupo");
    }
  }, [isLoading, checks.length, remaining.length, router, groupParam]);

  async function handleAudit(approved: boolean, reason?: string) {
    if (!current) return;
    // Optimistically remove from list immediately using composite key
    setAuditedKeys((prev) => { const s = new Set(prev); s.add(evidenceKey(current)); return s; });
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
      checkGoalId: current.goal_id ?? null,
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
  const done = auditedKeys.size;

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
            style={{ background: auditedKeys.has(evidenceKey(c)) ? "#EFC88B" : "var(--color-border)" }}
          />
        ))}
      </div>

      {/* Main card */}
      {current && (
        <div className="bg-[var(--color-bg-card)] rounded-[20px] p-4 mb-5">
          {/* User info */}
          <div className="flex items-center gap-2.5 mb-3">
            <UserAvatar url={current.avatar_url} name={current.full_name} size={36} />
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

          {/* Evidencia personalizada (resumen, audio, video, tiempo, después) */}
          {current.evidence && <CustomEvidence evidence={current.evidence} />}

          {/* Upload timestamp */}
          {current.uploaded_at && (
            <p className="text-[11px] text-[var(--color-muted)] text-right mt-1.5">
              Subida: {formatUploadTime(current.uploaded_at)}
            </p>
          )}

          {/* Pre-season notice */}
          {isPreSeason(current.check_date) && (
            <div
              className="mt-3 rounded-[12px] px-3.5 py-2.5 flex items-start gap-2.5"
              style={{ background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.25)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--color-warm)" }} />
              <p className="text-[12px]" style={{ color: "var(--color-warm)" }}>
                Pretemporada · Esta evidencia no suma puntos a la temporada en curso
              </p>
            </div>
          )}

          {/* Question */}
          <p className="text-[12px] text-[var(--color-fg)] text-center mt-3.5 mb-3">¿Cumplió con esta meta?</p>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={() => setRejectOpen(true)}
              disabled={audit.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 text-[13px] rounded-[13px] py-3 transition-opacity disabled:opacity-40" style={{ border: "1px solid var(--color-border)" }}
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
                <UserAvatar url={c.avatar_url} name={c.full_name} size={28} />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] truncate block">{c.full_name ?? "—"}</span>
                  {c.kind !== "gym" && c.goal_title && (
                    <span className="text-[11px] text-[var(--color-muted)] truncate block">{c.goal_title}</span>
                  )}
                </div>
                {isPreSeason(c.check_date) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(239,200,139,0.1)", color: "var(--color-warm)", border: "1px solid rgba(239,200,139,0.2)" }}>
                    Pre
                  </span>
                )}
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
        <VaulDrawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--color-overlay)" }} />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-[26px] outline-none flex flex-col" style={{ background: "var(--color-bg-card)" }}>
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>
          <div className="px-5 pb-8">
            <p className="font-display font-medium text-[17px] mb-1">Rechazar evidencia</p>
            <p className="text-[12px] text-[var(--color-muted)] mb-4">Escribe el motivo del rechazo (opcional)</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: La foto no muestra claramente el ejercicio…"
              rows={3}
              className="w-full rounded-[14px] px-4 py-3 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none resize-none mb-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
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
          className="flex items-center gap-2.5 rounded-full px-4 py-3 shadow-xl"
          style={{
            background: toast === "approved" ? "#14532d" : "#450a0a",
            border: toast === "approved" ? "1px solid rgba(34,197,94,0.5)" : "1px solid rgba(239,68,68,0.5)",
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
