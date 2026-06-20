"use client";

import { useState } from "react";
import { Check, Clock, X, Dumbbell, UtensilsCrossed, Target } from "lucide-react";
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
import { useMyGroups } from "@/lib/hooks/useGroups";
import { StatsSection } from "@/components/checklist/StatsSection";
import { GymSection, DietSection, GoalsSection } from "@/components/checklist/CheckSection";
import { GoalDrawer } from "@/components/checklist/GoalDrawer";
import { CheckDetailDrawer } from "@/components/checklist/CheckDetailDrawer";

// ── Past-day read-only view ────────────────────────────────────────────────

const DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];

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

function PastDayView({ dateStr, checks, goals }: { dateStr: string; checks: DailyCheck[]; goals: Goal[] }) {
  const gymCheck = checks.find((c) => c.kind === "gym");
  const dietGoals = goals.filter((g) => g.kind === "diet");
  const goalGoals = goals.filter((g) => g.kind === "goal");
  const hasAnything = checks.length > 0 || goals.length > 0;

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
          <StatusBadge status={gymCheck?.status} />
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
                <StatusBadge status={check?.status} />
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
                <StatusBadge status={check?.status} />
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
        <StatsSection
          checks={monthChecks}
          dietTotal={goals.filter((g) => g.kind === "diet").length}
          goalsTotal={goals.filter((g) => g.kind === "goal").length}
          view={view}
          onViewChange={setView}
          onDaySelect={(dateStr) => setSelectedDate(dateStr)}
        />

        {/* Divider */}
        <div className="h-px bg-[#1a1a1a] my-4" />

        {isToday ? (
          <>
            {/* Today label */}
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-3">Hoy</p>

            {/* Gym */}
            <GymSection
              check={gymCheck}
              onMark={(file) => handleMark(file, "gym")}
              onDetail={() => gymCheck && openDetail(null, gymCheck)}
              loading={markCheck.isPending}
            />

            {/* Diet */}
            <DietSection
              goals={goals}
              checks={todayChecks}
              onMark={handleMark}
              onAdd={() => openAdd("diet")}
              onEdit={openEdit}
              onDetail={openDetail}
              onReorder={(ids) => reorderGoals.mutate(ids)}
              loading={markCheck.isPending}
            />

            {/* Goals */}
            <GoalsSection
              goals={goals}
              checks={todayChecks}
              onMark={handleMark}
              onAdd={() => openAdd("goal")}
              onEdit={openEdit}
              onDetail={openDetail}
              onReorder={(ids) => reorderGoals.mutate(ids)}
              loading={markCheck.isPending}
            />
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
              <PastDayView dateStr={selectedDate!} checks={pastChecks} goals={goals} />
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
