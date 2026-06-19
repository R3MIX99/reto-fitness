"use client";

import { useRef } from "react";
import { Camera, Check, Clock, Pencil, ChevronsUpDown } from "lucide-react";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";

interface CheckItemProps {
  goal: Goal;
  check?: DailyCheck;
  onMark: (file: File, kind: GoalKind, goalId?: string) => void;
  onEdit?: () => void;
  loading?: boolean;
  reordering?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function CheckItem({ goal, check, onMark, onEdit, loading, reordering, dragHandleProps }: CheckItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const isDone = !!check;
  const isPending = check?.status === "pending";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onMark(file, goal.kind, goal.id);
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Status circle — hidden in reorder mode */}
      {!reordering && (
        <button
          onClick={() => !isDone && inputRef.current?.click()}
          disabled={isDone || loading}
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{
            background: isDone ? "rgba(207,92,54,0.15)" : "#1a1a1a",
            border: isDone ? "1.5px solid #CF5C36" : "1.5px solid #2a2a2a",
          }}
        >
          {isDone ? (
            <Check size={14} strokeWidth={2} className="text-accent" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a2a]" />
          )}
        </button>
      )}

      {/* Title */}
      <span
        className="flex-1 text-[14px]"
        style={{
          color: reordering ? "var(--color-fg)" : isDone ? "var(--color-muted)" : "var(--color-fg)",
          textDecoration: !reordering && isDone ? "line-through" : "none",
        }}
      >
        {goal.icon && <span className="mr-1.5">{goal.icon}</span>}
        {goal.title}
      </span>

      {/* Drag handle in reorder mode, badges+actions otherwise */}
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
              disabled={loading}
              className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[var(--color-muted)] transition-colors"
            >
              <Camera size={13} strokeWidth={1.5} />
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
    </div>
  );
}
