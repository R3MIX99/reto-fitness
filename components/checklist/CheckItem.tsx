"use client";

import { useRef, useState } from "react";
import { Camera, Check, Clock, Pencil, ChevronsUpDown, X, RotateCcw, CloudOff } from "lucide-react";
import type { Goal, DailyCheck, GoalKind, CheckEvidence, ExtraFiles } from "@/lib/hooks/useChecklist";
import { hasModules, PENDING_SYNC } from "@/lib/hooks/useChecklist";
import { compressImage } from "@/lib/hooks/useProfile";
import { EvidencePreviewDrawer } from "./EvidencePreviewDrawer";
import { PhotoSourceDrawer } from "./PhotoSourceDrawer";
import { CompleteGoalDrawer } from "./CompleteGoalDrawer";
import { UploadProgressModal } from "@/components/ui/UploadProgressModal";

interface CheckItemProps {
  goal: Goal;
  check?: DailyCheck;
  onMark: (file: File, kind: GoalKind, goalId?: string, evidence?: CheckEvidence, extraFiles?: ExtraFiles) => Promise<void>;
  onResubmit?: (file: File, evidence?: CheckEvidence, extraFiles?: ExtraFiles) => Promise<void>;
  onEdit?: () => void;
  onDetail?: () => void;
  loading?: boolean;
  reordering?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function CheckItem({ goal, check, onMark, onResubmit, onEdit, onDetail, loading, reordering, dragHandleProps }: CheckItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeIsResubmit, setCompleteIsResubmit] = useState(false);
  const [isResubmit, setIsResubmit] = useState(false);
  const [progressPhase, setProgressPhase] = useState<"uploading" | "success" | null>(null);
  const goalHasModules = hasModules(goal);

  // Meta personalizable (con módulos) → abre el flujo completo; si no, foto directa.
  function startCapture() {
    setError(null);
    if (goalHasModules) { setCompleteIsResubmit(false); setCompleteOpen(true); }
    else inputRef.current?.click();
  }

  // Volver a subir (rechazada): mismo flujo completo si la meta tiene módulos,
  // para poder rehacer audio/resumen/cronómetro, no solo la foto.
  function startResubmit() {
    setError(null);
    if (goalHasModules) { setCompleteIsResubmit(true); setCompleteOpen(true); }
    else setSourceOpen(true);
  }

  async function handleRichSubmit(file: File, evidence: CheckEvidence, extraFiles?: ExtraFiles) {
    setProgressPhase("uploading");
    const start = Date.now();
    try {
      if (completeIsResubmit && onResubmit) {
        await onResubmit(file, evidence, extraFiles);
      } else {
        await onMark(file, goal.kind, goal.id, evidence, extraFiles);
      }
    } catch (e) {
      setProgressPhase(null);
      throw e;
    }
    const elapsed = Date.now() - start;
    if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
    setProgressPhase("success");
  }

  const status = check?.status;
  const isDone = !!check;
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  // Guardado sin conexión: se ve completada, pendiente de sincronizar.
  const isSyncPending = status === PENDING_SYNC;

  // Descartar compresiones obsoletas si el usuario cierra/reintenta mientras corre.
  const captureGen = useRef(0);

  async function handleFileSelect(file: File, resubmit: boolean) {
    setIsResubmit(resubmit);
    setSourceOpen(false);
    // Abrir el preview YA ("Preparando foto…") y comprimir en segundo plano:
    // preview y subida usan la versión de 1080px; el original de cámara (12MP+)
    // se libera de inmediato (evita OOM) sin que el preview se sienta lento.
    const gen = ++captureGen.current;
    setPendingFile(null);
    setPreviewOpen(true);
    const small = await compressImage(file, 1080);
    if (captureGen.current === gen) setPendingFile(small);
  }

  async function handleConfirm() {
    if (!pendingFile) return;
    setError(null);
    setPreviewOpen(false);
    setProgressPhase("uploading");
    const start = Date.now();
    try {
      if (isResubmit && onResubmit) {
        await onResubmit(pendingFile);
      } else {
        await onMark(pendingFile, goal.kind, goal.id);
      }
      const elapsed = Date.now() - start;
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
      setProgressPhase("success");
    } catch (err) {
      setProgressPhase(null);
      setUploading(false);
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setPendingFile(null);
    }
  }

  function handleRetake() {
    captureGen.current++;
    setPreviewOpen(false);
    setPendingFile(null);
    if (isResubmit) {
      setSourceOpen(true);
    } else {
      if (inputRef.current) {
        inputRef.current.value = "";
        inputRef.current.click();
      }
    }
  }

  const circleStyle: React.CSSProperties = isRejected
    ? { background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.5)" }
    : isApproved
    ? { background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.5)" }
    : isPending || isSyncPending
    ? { background: "rgba(239,200,139,0.12)", border: "1.5px solid rgba(239,200,139,0.4)" }
    : { background: "var(--color-surface)", border: "1.5px solid var(--color-border)" };

  return (
    <>
      <div className="py-2.5">
        {error && (
          <p className="text-[11px] text-red-400 mb-1 pl-11">Error al subir. Toca la cámara para reintentar.</p>
        )}
        <div className="flex items-center gap-3">
          {/* Status circle */}
          {!reordering && (
            <button
              onClick={() => !isDone && !uploading && startCapture()}
              disabled={isDone || loading || uploading}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={circleStyle}
            >
              {isRejected ? (
                <X size={14} strokeWidth={2} style={{ color: "#ef4444" }} />
              ) : isApproved ? (
                <Check size={14} strokeWidth={2} style={{ color: "#22c55e" }} />
              ) : isSyncPending ? (
                <CloudOff size={12} strokeWidth={1.5} style={{ color: "#EFC88B" }} />
              ) : isPending ? (
                <Clock size={12} strokeWidth={1.5} style={{ color: "#EFC88B" }} />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-border)" }} />
              )}
            </button>
          )}

          {/* Title */}
          <button
            className="flex-1 text-[14px] text-left"
            style={{
              color: reordering ? "var(--color-fg)" : isRejected ? "#ef4444" : isDone ? "var(--color-muted)" : "var(--color-fg)",
              textDecoration: !reordering && isDone && !isRejected ? "line-through" : "none",
            }}
            onClick={() => isDone && !isSyncPending && !reordering && onDetail?.()}
            disabled={!isDone || isSyncPending || reordering}
          >
            {goal.icon && <span className="mr-1.5">{goal.icon}</span>}
            {goal.title}
          </button>

          {/* Badges + actions */}
          {reordering ? (
            <div
              {...dragHandleProps}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[var(--color-muted)] cursor-grab active:cursor-grabbing touch-none"
            >
              <ChevronsUpDown size={18} strokeWidth={1.5} />
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {isSyncPending && (
                <span className="flex items-center gap-1 text-[10px] text-[#EFC88B] bg-[rgba(239,200,139,0.12)] rounded-full px-2 py-0.5">
                  <CloudOff size={9} strokeWidth={1.5} />
                  sin conexión
                </span>
              )}
              {isPending && (
                <span className="flex items-center gap-1 text-[10px] text-[#EFC88B] bg-[rgba(239,200,139,0.12)] rounded-full px-2 py-0.5">
                  <Clock size={9} strokeWidth={1.5} />
                  revisión
                </span>
              )}
              {isApproved && (
                <span className="flex items-center gap-1 text-[10px] text-green-400 bg-[rgba(34,197,94,0.1)] rounded-full px-2 py-0.5">
                  <Check size={9} strokeWidth={2} />
                  aprobado
                </span>
              )}
              {isRejected && !onResubmit && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-[rgba(239,68,68,0.1)] rounded-full px-2 py-0.5">
                  <X size={9} strokeWidth={2} />
                  rechazado
                </span>
              )}
              {/* Icon-only resubmit button (only for rejected with resubmit handler) */}
              {isRejected && onResubmit && (
                <button
                  onClick={startResubmit}
                  disabled={uploading}
                  className="w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-50"
                  style={{
                    background: "rgba(239,200,139,0.1)",
                    border: "1px solid rgba(239,200,139,0.3)",
                  }}
                  title="Volver a subir"
                >
                  <RotateCcw size={11} strokeWidth={1.5} style={{ color: "var(--color-warm)" }} />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-fg)] transition-colors"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                </button>
              )}
              {!isDone && (
                <button
                  onClick={startCapture}
                  disabled={loading || uploading}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)] transition-colors disabled:opacity-40"
                  style={{ background: "var(--color-surface)" }}
                >
                  <Camera size={13} strokeWidth={1.5} style={{ color: error ? "#f87171" : undefined }} />
                </button>
              )}
            </div>
          )}

          {/* Hidden input for initial capture */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              void handleFileSelect(file, false);
            }}
          />
        </div>
      </div>

      {/* Preview drawer */}
      <EvidencePreviewDrawer
        file={pendingFile}
        open={previewOpen}
        uploading={uploading}
        onConfirm={handleConfirm}
        onRetake={handleRetake}
        onClose={() => { captureGen.current++; setPreviewOpen(false); setPendingFile(null); }}
      />

      {/* Source drawer (camera vs gallery) — only for resubmit */}
      {onResubmit && (
        <PhotoSourceDrawer
          open={sourceOpen}
          onClose={() => setSourceOpen(false)}
          onFileSelected={(file) => void handleFileSelect(file, true)}
        />
      )}

      {/* Meta personalizable: foto + cronómetro + resumen */}
      {hasModules(goal) && (
        <CompleteGoalDrawer
          open={completeOpen}
          onClose={() => setCompleteOpen(false)}
          goal={goal}
          onSubmit={handleRichSubmit}
        />
      )}

      <UploadProgressModal
        phase={progressPhase}
        onDone={() => { setProgressPhase(null); setUploading(false); }}
      />
    </>
  );
}
