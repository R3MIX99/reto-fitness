"use client";

import { useState } from "react";
import {
  useGoals,
  useTodayChecks,
  useMonthChecks,
  useMarkCheck,
  useUpsertGoal,
  useDeleteGoal,
  useReorderGoals,
} from "@/lib/hooks/useChecklist";
import type { Goal, DailyCheck, GoalKind, CategoryView } from "@/lib/hooks/useChecklist";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { StatsSection } from "@/components/checklist/StatsSection";
import { GymSection, DietSection, GoalsSection } from "@/components/checklist/CheckSection";
import { GoalDrawer } from "@/components/checklist/GoalDrawer";
import { CheckDetailDrawer } from "@/components/checklist/CheckDetailDrawer";

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
        />

        {/* Divider */}
        <div className="h-px bg-[#1a1a1a] my-4" />

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
