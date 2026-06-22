"use client";

import { useState, useRef } from "react";
import { Check, Clock, X, Dumbbell, UtensilsCrossed, Target, RefreshCw } from "lucide-react";
import {
  useGoals,
  useTodayChecks,
  useMonthChecks,
  useMarkCheck,
  useUpsertGoal,
  useDeleteGoal,
  useReorderGoals,
  useDateChecks,
  todayStr,
} from "@/lib/hooks/useChecklist";
import type { Goal, DailyCheck, GoalKind, CategoryView } from "@/lib/hooks/useChecklist";
import { useResubmitCheck } from "@/lib/hooks/useMyAudits";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { StatsSection } from "@/components/checklist/StatsSection";
import { GymSection, DietSection, GoalsSection } from "@/components/checklist/CheckSection";
import { GoalDrawer } from "@/components/checklist/GoalDrawer";
import { CheckDetailDrawer } from "@/components/checklist/CheckDetailDrawer";

// ── Past-day read-only view ────────────────────────────────────────────────

const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

function isInCurrentWeek(dateStr: string): boolean {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return d >= mon && d <= sun;
}

function formatPastDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function StatusBadge({ status }: { status?: string }) {
  if (status === "approved") return (
    <span className="flex items-center gap-1 text-[11px] text-green-400 border border-green-400/30 rounded-full px-2 py-0.5">
      <Check size={10} strokeWidth={2} /> Aprobado
    </span>
  );
  if (status === "rejected") return (
    <span className="flex items-center gap-1 text-[11px] text-red-400 border border-red-400/30 rounded-full px-2 py-0.5">
      <X size={10} strokeWidth={2} /> Rechazado
    </span>
  );
  if (status === "pending") return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--color-warm)] border border-[var(--color-warm)]/30 rounded-full px-2 py-0.5">
      <Clock size={10} strokeWidth={1.5} /> En revisión
    </span>
  );
  return (
    <span className="text-[11px] text-[var(--color-muted)]">Sin registro</span>
  );
}

type ResubmitFn = (check: DailyCheck, file: File) => Promise<void>;

function ResubmitButton({ check, onResubmit }: { check: DailyCheck; onResubmit: ResubmitFn }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 text-[11px] text-[var(--color-warm)] bg-[rgba(239,200,139,0.1)] border border-[var(--color-warm)]/30 rounded-full px-2.5 py-0.5 disabled:opacity-50"
      >
        <RefreshCw size={9} strokeWidth={1.5} />
        {uploading ? "Subiendo…" : "Volver a subir"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          e.target.value = "";
          setUploading(true);
          try { await onResubmit(check, file); } finally { setUploading(false); }
        }}
      />
    </>
  );
}

function PastDayView({
  dateStr,
  checks,
  goals,
  onResubmit,
}: {
  dateStr: string;
  checks: DailyCheck[];
  goals: Goal[];
  onResubmit?: ResubmitFn;
}) {
  const gymCheck = checks.find((c) => c.kind === "gym");
  const dietGoals = goals.filter((g) => g.kind === "diet");
  const goalGoals = goals.filter((g) => g.kind === "goal");
  const hasAnything = checks.length > 0 || goals.length > 0;
  const canResubmit = !!onResubmit && isInCurrentWeek(dateStr);

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <p className="text-[13px] text-[var(--color-muted)]">No había ningún registro este día.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Gym */}
      <div className="bg-[var(--color-bg-card)] rounded-[16px] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell size={15} strokeWidth={1.5} className="text-accent" />
            <span className="text-[14px] font-medium">Gimnasio</span>
          </div>
          <div className="flex items-center gap-2">
            {canResubmit && gymCheck?.status === "rejected" && onResubmit && (
              <ResubmitButton check={gymCheck} onResubmit={onResubmit} />
            )}
            <StatusBadge status={gymCheck?.status} />
          </div>
        </div>
      </div>

      {/* Diet */}
      {dietGoals.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-[16px] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <UtensilsCrossed size={15} strokeWidth={1.5} className="text-[var(--color-warm)]" />
            <span className="text-[14px] font-medium">Dieta</span>
          </div>
          {dietGoals.map((g) => {
            const check = checks.find((c) => c.kind === "diet" && c.goal_id === g.id);
            return (
              <div key={g.id} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-fg)]">{g.title}</span>
                <div className="flex items-center gap-2">
                  {canResubmit && check?.status === "rejected" && onResubmit && (
                    <ResubmitButton check={check} onResubmit={onResubmit} />
                  )}
                  <StatusBadge status={check?.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goals */}
      {goalGoals.length > 0 && (
        <div className="bg-[var(--color-bg-card)] rounded-[16px] p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={15} strokeWidth={1.5} className="text-[var(--color-muted)]" />
            <span className="text-[14px] font-medium">Metas diarias</span>
          </div>
          {goalGoals.map((g) => {
            const check = checks.find((c) => c.kind === "goal" && c.goal_id === g.id);
            return (
              <div key={g.id} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--color-fg)]">{g.title}</span>
                <div className="flex items-center gap-2">
                  {canResubmit && check?.status === "rejected" && onResubmit && (
                    <ResubmitButton check={check} onResubmit={onResubmit} />
                  )}
                  <StatusBadge status={check?.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const { data: groups = [] } = useMyGroups();
  const groupId = groups[0]?.id ?? null;

  const { data: goals = [] } = useGoals();
  const { data: todayChecks = [] } = useTodayChecks(groupId);
  const { data: monthChecks = [] } = useMonthChecks(groupId);

  const markCheck = useMarkCheck(groupId);
  const resubmitCheck = useResubmitCheck();
  const upsertGoal = useUpsertGoal();
  const deleteGoal = useDeleteGoal();
  const reorderGoals = useReorderGoals();

  const [view, setView] = useState<CategoryView>("general");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [defaultKind, setDefaultKind] = useState<GoalKind>("goal");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGoal, setDetailGoal] = useState<Goal | null>(null);
  const [detailCheck, setDetailCheck] = useState<DailyCheck | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const isToday = !selectedDate || selectedDate === todayStr();

  const { data: pastChecks = [], isLoading: pastLoading } = useDateChecks(
    isToday ? null : groupId,
    selectedDate ?? ""
  );

  function openDetail(goal: Goal | null, check: DailyCheck) {
    setDetailGoal(goal);
    setDetailCheck(check);
    setDetailOpen(true);
  }

  function openAdd(kind: GoalKind) {
    setEditingGoal(null);
    setDefaultKind(kind);
    setDrawerOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditingGoal(goal);
    setDefaultKind(goal.kind);
    setDrawerOpen(true);
  }

  async function handleMark(file: File, kind: GoalKind, goalId?: string): Promise<void> {
    if (!groupId) throw new Error("Sin grupo activo");
    await markCheck.mutateAsync({ file, kind, goalId });
  }

  async function handleResubmit(check: DailyCheck, file: File): Promise<void> {
    await resubmitCheck.mutateAsync({
      checkId: check.id,
      checkDate: check.check_date,
      kind: check.kind,
      goalId: check.goal_id,
      file,
    });
  }

  const gymCheck = todayChecks.find((c) => c.kind === "gym");

  if (!groupId) {
    return (
      <div className="px-4 pt-6 pb-28 flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
        <p className="text-[15px] font-medium">Únete a un grupo primero</p>
        <p className="text-[13px] text-[var(--color-muted)]">Necesitas pertenecer a un grupo para registrar tus checklist.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-2 pb-28">
        {/* Stats */}
        <div data-tour="checklist-stats">
          <StatsSection
            checks={monthChecks}
            dietTotal={goals.filter((g) => g.kind === "diet").length}
            goalsTotal={goals.filter((g) => g.kind === "goal").length}
            view={view}
            onViewChange={setView}
            onDaySelect={(dateStr) => setSelectedDate(dateStr)}
          />
        </div>

        {/* Divider */}
        <div className="h-px my-4" style={{ background: "var(--color-border)" }} />

        {isToday ? (
          <>
            {/* Today label */}
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-3">Hoy</p>

            {/* Gym */}
            <div data-tour="gym-section">
              <GymSection
                check={gymCheck}
                onMark={(file) => handleMark(file, "gym")}
                onResubmit={gymCheck ? (file) => handleResubmit(gymCheck, file) : undefined}
                onDetail={() => gymCheck && openDetail(null, gymCheck)}
              />
            </div>

            {/* Diet + Goals */}
            <div data-tour="goals-section">
            <DietSection
              goals={goals}
              checks={todayChecks}
              onMark={handleMark}
              onResubmit={handleResubmit}
              onAdd={() => openAdd("diet")}
              onEdit={openEdit}
              onDetail={openDetail}
              onReorder={(ids) => reorderGoals.mutate(ids)}
            />

            {/* Goals */}
            <GoalsSection
              goals={goals}
              checks={todayChecks}
              onMark={handleMark}
              onResubmit={handleResubmit}
              onAdd={() => openAdd("goal")}
              onEdit={openEdit}
              onDetail={openDetail}
              onReorder={(ids) => reorderGoals.mutate(ids)}
            />
            </div>
          </>
        ) : (
          <>
            {/* Past day label */}
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-3 capitalize">
              {formatPastDate(selectedDate!)}
            </p>

            {pastLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-14 bg-[var(--color-bg-card)] rounded-[16px]" />
                <div className="h-24 bg-[var(--color-bg-card)] rounded-[16px]" />
                <div className="h-24 bg-[var(--color-bg-card)] rounded-[16px]" />
              </div>
            ) : (
              <PastDayView dateStr={selectedDate!} checks={pastChecks} goals={goals} onResubmit={handleResubmit} />
            )}
          </>
        )}
      </div>

      <GoalDrawer
        open={drawerOpen}
        goal={editingGoal}
        defaultKind={defaultKind}
        onClose={() => setDrawerOpen(false)}
        onSave={(data) => upsertGoal.mutateAsync({ ...data, kind: data.kind as GoalKind })}
        onDelete={(id) => deleteGoal.mutateAsync(id)}
      />

      <CheckDetailDrawer
        open={detailOpen}
        goal={detailGoal}
        check={detailCheck}
        onClose={() => setDetailOpen(false)}
        onReplace={handleMark}
      />
    </>
  );
}
