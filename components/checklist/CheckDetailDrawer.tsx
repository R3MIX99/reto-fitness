"use client";

import { useState, useEffect } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Clock, CheckCircle2, X, Expand, XCircle, Timer, AlignLeft, Mic, Video } from "lucide-react";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";
import { isVideoPath } from "@/lib/hooks/useChecklist";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { EvidencePreviewDrawer } from "./EvidencePreviewDrawer";
import { PhotoSourceDrawer } from "./PhotoSourceDrawer";
import { AudioPlayer } from "@/components/ui/AudioPlayer";

// ── Signed URL hook ────────────────────────────────────────────────────────

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null); // limpiar inmediatamente para no mostrar imagen anterior
    if (!path) return;
    let cancelled = false;
    createClient()
      .storage.from("evidencias")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data) setUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function kindLabel(kind: string, goal?: Goal | null): string {
  if (kind === "gym") return "Ejercicio de hoy";
  return goal?.title ?? (kind === "diet" ? "Dieta" : "Meta");
}

// ── Photo modal (fullscreen, rendered outside drawer) ─────────────────────

interface PhotoModalProps {
  url: string;
  onClose: () => void;
}

function PhotoModal({ url, onClose }: PhotoModalProps) {
  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center z-10"
        aria-label="Cerrar"
      >
        <X size={18} strokeWidth={1.5} className="text-white" />
      </button>
      <div className="relative w-full h-full" onClick={onClose}>
        <Image
          src={url}
          alt="Evidencia"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface CheckDetailDrawerProps {
  open: boolean;
  goal: Goal | null;
  check: DailyCheck | null;
  onClose: () => void;
  onReplace: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
  onResubmit?: (file: File) => Promise<void>;
}

export function CheckDetailDrawer({ open, goal, check, onClose, onReplace, onResubmit }: CheckDetailDrawerProps) {
  const [replacing, setReplacing] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const signedUrl = useSignedUrl(check?.evidence_path ?? null);
  const afterUrl = useSignedUrl(check?.evidence?.after_path ?? null);
  const audioUrl = useSignedUrl(check?.evidence?.audio_path ?? null);
  const videoUrl = useSignedUrl(check?.evidence?.video_path ?? null);

  useEffect(() => {
    if (signedUrl) setPhotoUrl(signedUrl);
  }, [signedUrl]);

  function expandPhoto() {
    if (!photoUrl) return;
    onClose();
    setPhotoOpen(true);
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    setSourceOpen(false);
    setPreviewOpen(true);
  }

  function handleRetake() {
    setPreviewOpen(false);
    setPendingFile(null);
    setSourceOpen(true);
  }

  async function handleConfirm() {
    if (!pendingFile || !check) return;
    setReplacing(true);
    setPreviewOpen(false);
    try {
      if (isRejected && onResubmit) {
        await onResubmit(pendingFile);
      } else {
        await onReplace(pendingFile, check.kind as GoalKind, check.goal_id ?? undefined);
      }
      onClose();
    } finally {
      setReplacing(false);
      setPendingFile(null);
    }
  }

  const mainIsVideo = isVideoPath(check?.evidence_path ?? null);
  const title = kindLabel(check?.kind ?? "", goal);
  const status = check?.status;
  const isPending  = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  return (
    <>
      <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--color-overlay)" }} />
          <VaulDrawer.Content
            className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-[26px] outline-none flex flex-col"
            style={{ background: "var(--color-bg-card)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-[17px] truncate">{title}</p>
                {check && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                    <span className="text-[12px] text-[var(--color-muted)]">
                      Completado a las {formatTime(check.created_at)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {isPending && (
                  <span className="flex items-center gap-1 text-[10px] text-warm bg-warm/10 rounded-full px-2.5 py-1">
                    <Clock size={9} strokeWidth={1.5} />
                    En revisión
                  </span>
                )}
                {isApproved && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 rounded-full px-2.5 py-1">
                    <CheckCircle2 size={9} strokeWidth={2} />
                    Aprobado
                  </span>
                )}
                {isRejected && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 rounded-full px-2.5 py-1">
                    <XCircle size={9} strokeWidth={2} />
                    Rechazado
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "var(--color-surface)" }}
                >
                  <X size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                </button>
              </div>
            </div>

            {/* Evidence photo / video */}
            <div className="px-5 pb-8">
              {mainIsVideo ? (
                <div className="rounded-[18px] overflow-hidden mb-4 w-full max-w-[320px] mx-auto" style={{ background: "var(--color-surface)" }}>
                  {signedUrl ? (
                    <video controls src={signedUrl} className="w-full" style={{ maxHeight: 360 }} />
                  ) : (
                    <div className="flex items-center justify-center min-h-[200px]">
                      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-warm)" }} />
                    </div>
                  )}
                </div>
              ) : (
              <div
                className="relative rounded-[18px] overflow-hidden mb-4 aspect-square w-full max-w-[260px] mx-auto"
                style={{ background: "var(--color-surface)" }}
              >
                {signedUrl ? (
                  <>
                    <button
                      onClick={expandPhoto}
                      className="absolute inset-0 w-full h-full"
                      aria-label="Ver foto completa"
                    >
                      <Image src={signedUrl} alt="Evidencia" fill className="object-cover" unoptimized />
                    </button>
                    <button
                      onClick={expandPhoto}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                    >
                      <Expand size={13} strokeWidth={1.5} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[260px]">
                    <div
                      className="w-8 h-8 border-2 rounded-full animate-spin"
                      style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-warm)" }}
                    />
                  </div>
                )}
              </div>
              )}

              {/* Foto "después" (antes/después) */}
              {check?.evidence?.after_path && afterUrl && (
                <div className="mb-4">
                  <p className="text-[11px] text-[var(--color-muted)] mb-1.5 text-center">Después</p>
                  <div className="relative rounded-[18px] overflow-hidden aspect-square w-full max-w-[260px] mx-auto" style={{ background: "var(--color-surface)" }}>
                    <Image src={afterUrl} alt="Después" fill className="object-cover" unoptimized />
                  </div>
                </div>
              )}

              {/* Evidencia rica (cronómetro / resumen / audio / video) */}
              {check?.evidence && (check.evidence.summary || check.evidence.timer_seconds != null || check.evidence.audio_path || check.evidence.video_path) && (
                <div className="rounded-[14px] px-3.5 py-3 mb-4 space-y-3" style={{ background: "var(--color-surface)" }}>
                  {check.evidence.timer_seconds != null && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 text-[var(--color-muted)]"><Timer size={13} strokeWidth={1.5} /> Tiempo</span>
                      <span className="text-[var(--color-fg)]">
                        {Math.floor(check.evidence.timer_seconds / 60)} min {check.evidence.timer_seconds % 60}s
                      </span>
                    </div>
                  )}
                  {check.evidence.audio_path && (
                    <div>
                      <p className="text-[11px] text-[var(--color-muted)] mb-1 flex items-center gap-1.5"><Mic size={12} strokeWidth={1.5} /> Audio</p>
                      {audioUrl ? <AudioPlayer url={audioUrl} /> : <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>}
                    </div>
                  )}
                  {check.evidence.video_path && (
                    <div>
                      <p className="text-[11px] text-[var(--color-muted)] mb-1 flex items-center gap-1.5"><Video size={12} strokeWidth={1.5} /> Video</p>
                      {videoUrl ? <video controls src={videoUrl} className="w-full rounded-[10px]" style={{ maxHeight: 240 }} /> : <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>}
                    </div>
                  )}
                  {check.evidence.summary && (
                    <div>
                      <p className="text-[11px] text-[var(--color-muted)] mb-1 flex items-center gap-1.5"><AlignLeft size={12} strokeWidth={1.5} /> Resumen</p>
                      <p className="text-[13px]" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{check.evidence.summary}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom action — adapts to status */}
              {isApproved ? (
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center rounded-full py-3 text-[14px] font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  Cerrar
                </button>
              ) : isPending ? (
                <button
                  onClick={() => setSourceOpen(true)}
                  disabled={replacing}
                  className="w-full flex items-center justify-center gap-2 text-[var(--color-fg)] rounded-full py-3 text-[14px] disabled:opacity-50"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  {replacing ? "Subiendo…" : "Cambiar foto"}
                </button>
              ) : isRejected ? (
                <button
                  onClick={() => setSourceOpen(true)}
                  disabled={replacing}
                  className="w-full flex items-center justify-center gap-2 text-[var(--color-fg)] rounded-full py-3 text-[14px] disabled:opacity-50"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  {replacing ? "Subiendo…" : "Volver a subir"}
                </button>
              ) : null}
            </div>
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>

      {/* Fullscreen photo modal */}
      {photoOpen && photoUrl && (
        <PhotoModal url={photoUrl} onClose={() => setPhotoOpen(false)} />
      )}

      {/* Source + preview drawers (always rendered so Vaul can animate out) */}
      <PhotoSourceDrawer
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onFileSelected={handleFileSelected}
      />

      <EvidencePreviewDrawer
        file={pendingFile}
        open={previewOpen}
        uploading={replacing}
        onConfirm={handleConfirm}
        onRetake={handleRetake}
        onClose={() => { setPreviewOpen(false); setPendingFile(null); }}
      />
    </>
  );
}
