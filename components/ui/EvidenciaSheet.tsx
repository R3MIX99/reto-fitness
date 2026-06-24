"use client";

import { useRef, useState, useEffect } from "react";
import { Drawer } from "vaul";
import { X, Dumbbell, UtensilsCrossed, Target, Camera, Lock, ChevronRight, Check } from "lucide-react";
import type { Goal, GoalKind, DailyCheck } from "@/lib/hooks/useChecklist";
import { useGoals, useMarkCheck, useTodayChecks } from "@/lib/hooks/useChecklist";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { PhotoSourceDrawer } from "@/components/checklist/PhotoSourceDrawer";
import { EvidencePreviewDrawer } from "@/components/checklist/EvidencePreviewDrawer";
import { UploadProgressModal } from "@/components/ui/UploadProgressModal";

// ── Sub-sheet para elegir bloque de dieta o meta ───────────────────────────

function PickerSheet({
  open,
  kind,
  goals,
  checks,
  onPick,
  onClose,
}: {
  open: boolean;
  kind: GoalKind | null;
  goals: Goal[];
  checks: DailyCheck[];
  onPick: (goal: Goal) => void;
  onClose: () => void;
}) {
  const filtered = goals.filter((g) => g.kind === kind);
  const title = kind === "diet" ? "Elige el bloque de comida" : "Elige la meta";

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90]" style={{ background: "var(--color-overlay)" }} />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[100] rounded-t-[26px] outline-none" style={{ background: "var(--color-bg-card)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--color-border)" }} />
          <div className="px-5 pb-10">
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-4">{title}</p>
            {filtered.length === 0 ? (
              <p className="text-[13px] text-[var(--color-muted)] text-center py-6">
                No tienes {kind === "diet" ? "comidas" : "metas"} registradas aún.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((g) => {
                  const done = checks.some((c) => c.goal_id === g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => !done && onPick(g)}
                      disabled={done}
                      className="flex items-center gap-3 rounded-[14px] px-4 py-3.5 text-left transition-opacity"
                      style={{
                        background: done ? "rgba(207,92,54,0.08)" : "var(--color-surface)",
                        border: done ? "1px solid rgba(207,92,54,0.3)" : "1px solid var(--color-border)",
                        opacity: done ? 0.7 : 1,
                      }}
                    >
                      {g.icon && <span className="text-lg">{g.icon}</span>}
                      <span className="flex-1 text-[14px] font-medium" style={{ textDecoration: done ? "line-through" : "none", color: done ? "var(--color-muted)" : "var(--color-fg)" }}>{g.title}</span>
                      {done
                        ? <Check size={15} strokeWidth={2} className="text-accent flex-shrink-0" />
                        : <ChevronRight size={15} strokeWidth={1.5} className="text-[var(--color-muted)] flex-shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Toast de éxito ────────────────────────────────────────────────────────

function SuccessToast({ label, onDone }: { label: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed z-[200] left-1/2 flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-lg"
      style={{
        background: "var(--color-bg-card2)",
        border: "1px solid var(--color-border)",
        bottom: "80px",
        transform: `translateX(-50%) translateY(${visible ? "0" : "12px"})`,
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
      }}
    >
      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
        <Check size={11} strokeWidth={2.5} className="text-accent" />
      </div>
      <span className="text-[13px] font-medium text-[var(--color-fg)] whitespace-nowrap">
        {label} registrado
      </span>
    </div>
  );
}

// ── Main EvidenciaSheet ────────────────────────────────────────────────────

interface EvidenciaSheetProps {
  open: boolean;
  onClose: () => void;
}

type OptionKind = "gym" | "diet" | "goal";

const OPTIONS: { kind: OptionKind; label: string; desc: string; color: string; tint: string; Icon: React.ElementType }[] = [
  { kind: "gym",  label: "Ejercicio",   desc: "Entrenamiento de hoy",      color: "#CF5C36", tint: "rgba(207,92,54,.2)",   Icon: Dumbbell        },
  { kind: "diet", label: "Dieta",       desc: "Elige el bloque",           color: "#EFC88B", tint: "rgba(239,200,139,.18)", Icon: UtensilsCrossed },
  { kind: "goal", label: "Meta diaria", desc: "Elige la meta a registrar", color: "#EFC88B", tint: "rgba(239,200,139,.18)", Icon: Target           },
];

export function EvidenciaSheet({ open, onClose }: EvidenciaSheetProps) {
  const { data: groups = [] } = useMyGroups();
  const groupId = groups[0]?.id ?? null;
  const allGroupIds = groups.map((g) => g.id);
  const { data: goals = [] } = useGoals();
  const { data: todayChecks = [] } = useTodayChecks(allGroupIds);
  const markCheck = useMarkCheck(groupId);
  const gymDone = todayChecks.some((c) => c.kind === "gym");

  const [pickerKind, setPickerKind] = useState<GoalKind | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successLabel, setSuccessLabel] = useState<string | null>(null);

  // Preview + source drawer state
  const [sourceOpen, setSourceOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [progressPhase, setProgressPhase] = useState<"uploading" | "success" | null>(null);

  const pendingGoal = useRef<Goal | null>(null);
  const pendingKind = useRef<OptionKind | null>(null);

  function handleOption(kind: OptionKind) {
    setUploadError(null);
    pendingKind.current = kind;
    pendingGoal.current = null;
    if (kind === "gym") {
      setSourceOpen(true);
    } else {
      setPickerKind(kind as GoalKind);
      setPickerOpen(true);
    }
  }

  function handleGoalPicked(goal: Goal) {
    setPickerOpen(false);
    pendingKind.current = goal.kind;
    pendingGoal.current = goal;
    setTimeout(() => setSourceOpen(true), 300);
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    setSourceOpen(false);
    setPreviewOpen(true);
  }

  async function handleConfirmUpload() {
    if (!pendingFile || !groupId || !pendingKind.current) return;
    setUploadError(null);
    setPreviewOpen(false);
    onClose();
    setProgressPhase("uploading");
    const start = Date.now();
    try {
      await markCheck.mutateAsync({
        file: pendingFile,
        kind: pendingKind.current as GoalKind,
        goalId: pendingGoal.current?.id,
      });
      const elapsed = Date.now() - start;
      if (elapsed < 1000) await new Promise((r) => setTimeout(r, 1000 - elapsed));
      setProgressPhase("success");
    } catch (err) {
      setProgressPhase(null);
      setUploadError(err instanceof Error ? err.message : "Error al subir la foto");
    } finally {
      setPendingFile(null);
    }
  }

  function handleSuccessLabel() {
    const label = pendingGoal.current?.title
      ?? (pendingKind.current === "gym" ? "Ejercicio" : "Elemento");
    setProgressPhase(null);
    setSuccessLabel(label);
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--color-overlay)" }} />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[80] rounded-t-[26px] outline-none" style={{ background: "var(--color-bg-card)" }}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mt-3" style={{ background: "var(--color-border)" }} />

            <div className="px-5 pb-8 pt-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-1">
                <span className="font-display font-medium text-[18px]">Subir evidencia</span>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-muted)]"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-[12px] text-[var(--color-muted)] mb-5">
                ¿Qué cumpliste? Sube una foto como prueba.
              </p>

              {/* Options */}
              <div className="flex flex-col gap-2.5">
                {OPTIONS.map(({ kind, label, desc, color, tint, Icon }) => {
                  const done = kind === "gym" ? gymDone : false;
                  return (
                    <button
                      key={kind}
                      onClick={() => !done && handleOption(kind)}
                      disabled={markCheck.isPending || done}
                      className="flex items-center gap-3 rounded-[16px] px-4 py-3.5 text-left transition-opacity"
                      style={{
                        background: done ? "rgba(207,92,54,0.08)" : "var(--color-surface)",
                        border: done ? "1px solid rgba(207,92,54,0.3)" : "1px solid var(--color-border)",
                        opacity: markCheck.isPending ? 0.4 : 1,
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                        style={{ background: tint }}
                      >
                        <Icon size={20} strokeWidth={1.5} style={{ color }} />
                      </div>
                      <div className="flex-1 leading-snug">
                        <p className="text-[14px] font-medium" style={{ color: done ? "var(--color-muted)" : "var(--color-fg)", textDecoration: done ? "line-through" : "none" }}>{label}</p>
                        <p className="text-[11px] text-[var(--color-muted)]">{done ? "Completado hoy" : desc}</p>
                      </div>
                      {done
                        ? <Check size={18} strokeWidth={2} className="text-accent flex-shrink-0" />
                        : <Camera size={18} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                      }
                    </button>
                  );
                })}
              </div>

              {uploadError && (
                <p className="mt-4 text-[12px] text-red-400 text-center">{uploadError}</p>
              )}

              <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-[var(--color-muted)]">
                <Lock size={11} strokeWidth={1.5} />
                La foto se valida en la auditoría semanal
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Picker sub-sheet */}
      <PickerSheet
        open={pickerOpen}
        kind={pickerKind}
        goals={goals}
        checks={todayChecks}
        onPick={handleGoalPicked}
        onClose={() => setPickerOpen(false)}
      />

      {/* Source drawer: camera vs gallery */}
      <PhotoSourceDrawer
        open={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onFileSelected={handleFileSelected}
      />

      {/* Preview before upload */}
      <EvidencePreviewDrawer
        file={pendingFile}
        open={previewOpen}
        uploading={false}
        onConfirm={handleConfirmUpload}
        onRetake={() => { setPreviewOpen(false); setPendingFile(null); setSourceOpen(true); }}
        onClose={() => { setPreviewOpen(false); setPendingFile(null); }}
      />

      {/* Upload progress modal */}
      <UploadProgressModal
        phase={progressPhase}
        onDone={handleSuccessLabel}
      />

      {/* Toast de confirmación */}
      {successLabel && (
        <SuccessToast label={successLabel} onDone={() => setSuccessLabel(null)} />
      )}
    </>
  );
}
