"use client";

import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, Camera, Check, Clock, ArrowUpDown, X, RefreshCw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";
import { CheckItem } from "./CheckItem";

// ── Sortable wrapper ───────────────────────────────────────────────────────

function SortableCheckItem({
  goal,
  check,
  onMark,
  onResubmit,
  onEdit,
  onDetail,
  loading,
  reordering,
}: {
  goal: Goal;
  check?: DailyCheck;
  onMark: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
  onResubmit?: (file: File) => Promise<void>;
  onEdit: () => void;
  onDetail: () => void;
  loading?: boolean;
  reordering: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CheckItem
        goal={goal}
        check={check}
        onMark={onMark}
        onResubmit={onResubmit}
        onEdit={onEdit}
        onDetail={onDetail}
        loading={loading}
        reordering={reordering}
        dragHandleProps={reordering ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

// ── Gym Section ────────────────────────────────────────────────────────────

interface GymSectionProps {
  check?: DailyCheck;
  onMark: (file: File) => void;
  onResubmit?: (file: File) => Promise<void>;
  onDetail?: () => void;
  loading?: boolean;
}

export function GymSection({ check, onMark, onResubmit, onDetail, loading }: GymSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const resubmitRef = useRef<HTMLInputElement>(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitError, setResubmitError] = useState(false);
  const isDone = !!check;
  const isPending = check?.status === "pending";
  const isApproved = check?.status === "approved";
  const isRejected = check?.status === "rejected";

  const circleStyle: React.CSSProperties = isRejected
    ? { background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.5)" }
    : isApproved
    ? { background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.5)" }
    : isPending
    ? { background: "rgba(239,200,139,0.12)", border: "2px solid rgba(239,200,139,0.4)" }
    : { background: "var(--color-surface)", border: "2px solid var(--color-border)" };

  const statusLabel = isRejected ? "Rechazado" : isApproved ? "Aprobado" : isPending ? "En revisión" : "Sube una foto del entrenamiento";

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => !isDone && inputRef.current?.click()}
          disabled={isDone || loading}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={circleStyle}
        >
          {isRejected ? (
            <X size={20} strokeWidth={2} style={{ color: "#ef4444" }} />
          ) : isApproved ? (
            <Check size={20} strokeWidth={2} style={{ color: "#22c55e" }} />
          ) : isPending ? (
            <Clock size={18} strokeWidth={1.5} style={{ color: "#EFC88B" }} />
          ) : (
            <Camera size={18} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          )}
        </button>

        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => isDone && onDetail?.()}
          disabled={!isDone}
        >
          <p className="text-[15px] font-medium" style={{ color: isRejected ? "#ef4444" : undefined }}>
            Ejercicio de hoy
          </p>
          <p className="text-[12px] text-[var(--color-muted)]">{statusLabel}</p>
        </button>

        {isPending && (
          <span className="flex items-center gap-1 text-[10px] text-[#EFC88B] bg-[rgba(239,200,139,0.12)] rounded-full px-2.5 py-1">
            <Clock size={9} strokeWidth={1.5} />
            revisión
          </span>
        )}
        {isApproved && (
          <span className="flex items-center gap-1 text-[10px] text-green-400 bg-[rgba(34,197,94,0.1)] rounded-full px-2.5 py-1">
            <Check size={9} strokeWidth={2} />
            aprobado
          </span>
        )}
        {isRejected && !onResubmit && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 bg-[rgba(239,68,68,0.1)] rounded-full px-2.5 py-1">
            <X size={9} strokeWidth={2} />
            rechazado
          </span>
        )}
        {isRejected && onResubmit && (
          <button
            onClick={() => { setResubmitError(false); resubmitRef.current?.click(); }}
            disabled={resubmitting}
            className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3.5 py-2 transition-opacity disabled:opacity-50"
            style={{
              color: resubmitError ? "#ef4444" : "var(--color-warm)",
              background: resubmitError ? "rgba(239,68,68,0.1)" : "rgba(239,200,139,0.1)",
              border: resubmitError ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(239,200,139,0.3)",
            }}
          >
            <RefreshCw size={12} strokeWidth={1.5} />
            {resubmitting ? "Subiendo…" : resubmitError ? "Error, reintentar" : "Volver a subir"}
          </button>
        )}
        {!isDone && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex-shrink-0 flex items-center gap-1.5 bg-accent text-white text-[12px] font-medium rounded-full px-3.5 py-2 transition-opacity disabled:opacity-50"
          >
            <Camera size={12} strokeWidth={1.5} />
            Subir
          </button>
        )}
      </div>

      <input
        ref={resubmitRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !onResubmit) return;
          e.target.value = "";
          setResubmitting(true);
          try {
            await onResubmit(file);
            setResubmitError(false);
          } catch {
            setResubmitError(true);
          } finally {
            setResubmitting(false);
          }
        }}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { onMark(file); e.target.value = ""; }
        }}
      />
    </div>
  );
}

// ── Diet Section ───────────────────────────────────────────────────────────

interface DietSectionProps {
  goals: Goal[];
  checks: DailyCheck[];
  onMark: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
  onResubmit?: (check: DailyCheck, file: File) => Promise<void>;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDetail: (goal: Goal, check: DailyCheck) => void;
  onReorder: (orderedIds: string[]) => void;
  loading?: boolean;
}

export function DietSection({ goals, checks, onMark, onResubmit, onAdd, onEdit, onDetail, onReorder, loading }: DietSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const dietGoals = goals.filter((g) => g.kind === "diet");
  const orderedGoals = reordering
    ? localOrder.map((id) => dietGoals.find((g) => g.id === id)!).filter(Boolean)
    : dietGoals;
  const dietChecks = checks.filter((c) => c.kind === "diet");
  const done = dietChecks.length;
  const total = dietGoals.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function startReorder() {
    setLocalOrder(dietGoals.map((g) => g.id));
    setReordering(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.indexOf(active.id as string);
    const newIndex = localOrder.indexOf(over.id as string);
    setLocalOrder(arrayMove(localOrder, oldIndex, newIndex));
  }

  function saveOrder() {
    onReorder(localOrder);
    setReordering(false);
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      {/* Header */}
      <div className="w-full flex items-center gap-2 mb-1">
        <button className="flex-1 flex items-center gap-2 text-left" onClick={() => !reordering && setCollapsed((c) => !c)}>
          <span className="text-[15px] font-medium">Dieta</span>
          {!reordering && <span className="text-[12px] text-[var(--color-muted)]">{done}/{total}</span>}
          {!reordering && (collapsed
            ? <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            : <ChevronUp size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          )}
        </button>
        {!collapsed && total > 1 && (
          reordering ? (
            <button
              onClick={saveOrder}
              className="text-[12px] text-warm font-medium flex-shrink-0"
            >
              Listo
            </button>
          ) : (
            <button
              onClick={startReorder}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)]"
            >
              <ArrowUpDown size={13} strokeWidth={1.5} />
            </button>
          )
        )}
      </div>

      {!collapsed && (
        <div>
          {dietGoals.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] py-2">Sin comidas registradas. Agrega una.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {orderedGoals.map((goal) => {
                    const check = dietChecks.find((c) => c.goal_id === goal.id);
                    return (
                      <SortableCheckItem
                        key={goal.id}
                        goal={goal}
                        check={check}
                        onMark={onMark}
                        onResubmit={check && onResubmit ? (file) => onResubmit(check, file) : undefined}
                        onEdit={() => onEdit(goal)}
                        onDetail={() => check && onDetail(goal, check)}
                        loading={loading}
                        reordering={reordering}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {!reordering && (
            <button
              onClick={onAdd}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] py-1"
            >
              <Plus size={13} strokeWidth={1.5} />
              Agregar comida
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Goals Section ──────────────────────────────────────────────────────────

interface GoalsSectionProps {
  goals: Goal[];
  checks: DailyCheck[];
  onMark: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
  onResubmit?: (check: DailyCheck, file: File) => Promise<void>;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onDetail: (goal: Goal, check: DailyCheck) => void;
  onReorder: (orderedIds: string[]) => void;
  loading?: boolean;
}

export function GoalsSection({ goals, checks, onMark, onResubmit, onAdd, onEdit, onDetail, onReorder, loading }: GoalsSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const goalGoals = goals.filter((g) => g.kind === "goal");
  const orderedGoals = reordering
    ? localOrder.map((id) => goalGoals.find((g) => g.id === id)!).filter(Boolean)
    : goalGoals;
  const goalChecks = checks.filter((c) => c.kind === "goal");
  const done = goalChecks.length;
  const total = goalGoals.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function startReorder() {
    setLocalOrder(goalGoals.map((g) => g.id));
    setReordering(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localOrder.indexOf(active.id as string);
    const newIndex = localOrder.indexOf(over.id as string);
    setLocalOrder(arrayMove(localOrder, oldIndex, newIndex));
  }

  function saveOrder() {
    onReorder(localOrder);
    setReordering(false);
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      <div className="w-full flex items-center gap-2 mb-1">
        <button className="flex-1 flex items-center gap-2 text-left" onClick={() => !reordering && setCollapsed((c) => !c)}>
          <span className="text-[15px] font-medium">Metas diarias</span>
          {!reordering && <span className="text-[12px] text-[var(--color-muted)]">{done}/{total}</span>}
          {!reordering && (collapsed
            ? <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            : <ChevronUp size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          )}
        </button>
        {!collapsed && total > 1 && (
          reordering ? (
            <button
              onClick={saveOrder}
              className="text-[12px] text-warm font-medium flex-shrink-0"
            >
              Listo
            </button>
          ) : (
            <button
              onClick={startReorder}
              className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-muted)]"
            >
              <ArrowUpDown size={13} strokeWidth={1.5} />
            </button>
          )
        )}
      </div>

      {!collapsed && (
        <div>
          {goalGoals.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] py-2">Sin metas registradas. Agrega una.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedGoals.map((g) => g.id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {orderedGoals.map((goal) => {
                    const check = goalChecks.find((c) => c.goal_id === goal.id);
                    return (
                      <SortableCheckItem
                        key={goal.id}
                        goal={goal}
                        check={check}
                        onMark={onMark}
                        onResubmit={check && onResubmit ? (file) => onResubmit(check, file) : undefined}
                        onEdit={() => onEdit(goal)}
                        onDetail={() => check && onDetail(goal, check)}
                        loading={loading}
                        reordering={reordering}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {!reordering && (
            <button
              onClick={onAdd}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] py-1"
            >
              <Plus size={13} strokeWidth={1.5} />
              Agregar meta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
