"use client";

import { useRef, useState } from "react";
import { Camera, Check, Clock, Pencil, ChevronsUpDown, X, RefreshCw } from "lucide-react";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";

interface CheckItemProps {
  goal: Goal;
  check?: DailyCheck;
  onMark: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
  onResubmit?: (file: File) => Promise<void>;
  onEdit?: () => void;
  onDetail?: () => void;
  loading?: boolean;
  reordering?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function CheckItem({ goal, check, onMark, onResubmit, onEdit, onDetail, loading, reordering, dragHandleProps }: CheckItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resubmitRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resubmitFailed, setResubmitFailed] = useState(false);

  const status = check?.status;
  const isDone = !!check;
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError(null);
    setUploading(true);
    try {
      await onMark(file, goal.kind, goal.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleResubmitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onResubmit) return;
    e.target.value = "";
    setResubmitFailed(false);
    setUploading(true);
    try {
      await onResubmit(file);
      setResubmitFailed(false);
    } catch {
      setResubmitFailed(true);
    } finally {
      setUploading(false);
    }
  }

  // Circle styles per status
  const circleStyle: React.CSSProperties = isRejected
    ? { background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.5)" }
    : isApproved
    ? { background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.5)" }
    : isPending
    ? { background: "rgba(239,200,139,0.12)", border: "1.5px solid rgba(239,200,139,0.4)" }
    : { background: "#1a1a1a", border: "1.5px solid #2a2a2a" };

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Status circle */}
      {!reordering && (
        <button
          onClick={() => !isDone && inputRef.current?.click()}
          disabled={isDone || loading}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={circleStyle}
        >
          {isRejected ? (
            <X size={14} strokeWidth={2} style={{ color: "#ef4444" }} />
          ) : isApproved ? (
            <Check size={14} strokeWidth={2} style={{ color: "#22c55e" }} />
          ) : isPending ? (
            <Clock size={12} strokeWidth={1.5} style={{ color: "#EFC88B" }} />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a2a]" />
          )}
        </button>
      )}

      {/* Title */}
      <button
        className="flex-1 text-[14px] text-left"
        style={{
          color: reordering
            ? "var(--color-fg)"
            : isRejected
            ? "#ef4444"
            : isDone
            ? "var(--color-muted)"
            : "var(--color-fg)",
          textDecoration: !reordering && isDone && !isRejected ? "line-through" : "none",
        }}
        onClick={() => isDone && !reordering && onDetail?.()}
        disabled={!isDone || reordering}
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
          {isRejected && onResubmit && (
            <button
              onClick={() => { setResubmitFailed(false); resubmitRef.current?.click(); }}
              disabled={uploading}
              className="flex items-center gap-1 text-[10px] rounded-full px-2.5 py-0.5 disabled:opacity-50"
              style={{
                color: resubmitFailed ? "#ef4444" : "var(--color-warm)",
                background: resubmitFailed ? "rgba(239,68,68,0.1)" : "rgba(239,200,139,0.1)",
                border: resubmitFailed ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(239,200,139,0.3)",
              }}
            >
              <RefreshCw size={9} strokeWidth={1.5} />
              {uploading ? "Subiendo…" : resubmitFailed ? "Error, reintentar" : "Volver a subir"}
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
              onClick={() => inputRef.current?.click()}
              disabled={loading || uploading}
              className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[var(--color-muted)] transition-colors disabled:opacity-40"
            >
              <Camera size={13} strokeWidth={1.5} style={{ color: error ? "#f87171" : undefined }} />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={resubmitRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleResubmitChange}
      />
    </div>
  );
}
