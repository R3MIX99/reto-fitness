"use client";

import { useState, useRef } from "react";
import { Plus, ChevronDown, ChevronUp, Camera, Check, Clock } from "lucide-react";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";
import { CheckItem } from "./CheckItem";

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
        {/* Big status button */}
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
  loading?: boolean;
}

export function DietSection({ goals, checks, onMark, onAdd, onEdit, loading }: DietSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const dietGoals = goals.filter((g) => g.kind === "diet");
  const dietChecks = checks.filter((c) => c.kind === "diet");
  const done = dietChecks.length;
  const total = dietGoals.length;

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      {/* Header */}
      <button
        className="w-full flex items-center gap-2 mb-1"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="text-[15px] font-medium flex-1 text-left">Dieta</span>
        <span className="text-[12px] text-[var(--color-muted)]">{done}/{total}</span>
        {collapsed ? <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" /> : <ChevronUp size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />}
      </button>

      {!collapsed && (
        <div>
          {dietGoals.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] py-2">Sin comidas registradas. Agrega una.</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {dietGoals.map((goal) => {
                const check = dietChecks.find((c) => c.goal_id === goal.id);
                return (
                  <CheckItem
                    key={goal.id}
                    goal={goal}
                    check={check}
                    onMark={onMark}
                    onEdit={() => onEdit(goal)}
                    loading={loading}
                  />
                );
              })}
            </div>
          )}

          <button
            onClick={onAdd}
            className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] py-1"
          >
            <Plus size={13} strokeWidth={1.5} />
            Agregar comida
          </button>
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
  loading?: boolean;
}

export function GoalsSection({ goals, checks, onMark, onAdd, onEdit, loading }: GoalsSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const goalGoals = goals.filter((g) => g.kind === "goal");
  const goalChecks = checks.filter((c) => c.kind === "goal");
  const done = goalChecks.length;
  const total = goalGoals.length;

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] p-4 mb-3">
      <button
        className="w-full flex items-center gap-2 mb-1"
        onClick={() => setCollapsed((c) => !c)}
      >
        <span className="text-[15px] font-medium flex-1 text-left">Metas diarias</span>
        <span className="text-[12px] text-[var(--color-muted)]">{done}/{total}</span>
        {collapsed ? <ChevronDown size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" /> : <ChevronUp size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />}
      </button>

      {!collapsed && (
        <div>
          {goalGoals.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] py-2">Sin metas registradas. Agrega una.</p>
          ) : (
            <div className="divide-y divide-[#1a1a1a]">
              {goalGoals.map((goal) => {
                const check = goalChecks.find((c) => c.goal_id === goal.id);
                return (
                  <CheckItem
                    key={goal.id}
                    goal={goal}
                    check={check}
                    onMark={onMark}
                    onEdit={() => onEdit(goal)}
                    loading={loading}
                  />
                );
              })}
            </div>
          )}

          <button
            onClick={onAdd}
            className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] py-1"
          >
            <Plus size={13} strokeWidth={1.5} />
            Agregar meta
          </button>
        </div>
      )}
    </div>
  );
}
