"use client";

import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, Camera, Check, Clock, ArrowUpDown } from "lucide-react";
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
  onEdit,
  loading,
  reordering,
}: {
  goal: Goal;
  check?: DailyCheck;
  onMark: (file: File, kind: GoalKind, goalId?: string) => void;
  onEdit: () => void;
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
        onEdit={onEdit}
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
  loading?: boolean;
}

export function GymSection({ check, onMark, loading }: GymSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDone = !!check;
  const isPending = check?.status === "pending";

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => !isDone && inputRef.current?.click()}
          disabled={isDone || loading}
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: isDone ? "rgba(207,92,54,0.18)" : "#1a1a1a",
            border: isDone ? "2px solid #CF5C36" : "2px solid #2a2a2a",
          }}
        >
          {isDone ? (
            <Check size={20} strokeWidth={2} className="text-accent" />
          ) : (
            <Camera size={18} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium">Ejercicio de hoy</p>
          <p className="text-[12px] text-[var(--color-muted)]">
            {isDone ? (isPending ? "En revisión" : "Completado") : "Sube una foto del entrenamiento"}
          </p>
        </div>

        {isPending && (
          <span className="flex items-center gap-1 text-[10px] text-[#EFC88B] bg-[rgba(239,200,139,0.12)] rounded-full px-2.5 py-1">
            <Clock size={9} strokeWidth={1.5} />
            revisión
          </span>
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
  onMark: (file: File, kind: GoalKind, goalId?: string) => void;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onReorder: (orderedIds: string[]) => void;
  loading?: boolean;
}

export function DietSection({ goals, checks, onMark, onAdd, onEdit, onReorder, loading }: DietSectionProps) {
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
                <div className="divide-y divide-[#1a1a1a]">
                  {orderedGoals.map((goal) => {
                    const check = dietChecks.find((c) => c.goal_id === goal.id);
                    return (
                      <SortableCheckItem
                        key={goal.id}
                        goal={goal}
                        check={check}
                        onMark={onMark}
                        onEdit={() => onEdit(goal)}
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
  onMark: (file: File, kind: GoalKind, goalId?: string) => void;
  onAdd: () => void;
  onEdit: (goal: Goal) => void;
  onReorder: (orderedIds: string[]) => void;
  loading?: boolean;
}

export function GoalsSection({ goals, checks, onMark, onAdd, onEdit, onReorder, loading }: GoalsSectionProps) {
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
                <div className="divide-y divide-[#1a1a1a]">
                  {orderedGoals.map((goal) => {
                    const check = goalChecks.find((c) => c.goal_id === goal.id);
                    return (
                      <SortableCheckItem
                        key={goal.id}
                        goal={goal}
                        check={check}
                        onMark={onMark}
                        onEdit={() => onEdit(goal)}
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
