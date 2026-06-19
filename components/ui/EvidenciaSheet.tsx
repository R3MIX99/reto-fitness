"use client";

import { useRef, useState } from "react";
import { Drawer } from "vaul";
import { X, Dumbbell, UtensilsCrossed, Target, Camera, Lock, ChevronRight } from "lucide-react";
import type { Goal, GoalKind } from "@/lib/hooks/useChecklist";
import { useGoals, useMarkCheck } from "@/lib/hooks/useChecklist";
import { useMyGroups } from "@/lib/hooks/useGroups";

// ── Sub-sheet para elegir bloque de dieta o meta ───────────────────────────

function PickerSheet({
  open,
  kind,
  goals,
  onPick,
  onClose,
}: {
  open: boolean;
  kind: GoalKind | null;
  goals: Goal[];
  onPick: (goal: Goal) => void;
  onClose: () => void;
}) {
  const filtered = goals.filter((g) => g.kind === kind);
  const title = kind === "diet" ? "Elige el bloque de comida" : "Elige la meta";

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[90]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0e0e0e] rounded-t-[26px] outline-none">
          <div className="w-10 h-1 rounded-full bg-[#2a2a2a] mx-auto mt-3 mb-4" />
          <div className="px-5 pb-10">
            <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider mb-4">{title}</p>
            {filtered.length === 0 ? (
              <p className="text-[13px] text-[var(--color-muted)] text-center py-6">
                No tienes {kind === "diet" ? "comidas" : "metas"} registradas aún.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => onPick(g)}
                    className="flex items-center gap-3 bg-[#161616] border border-[#232323] rounded-[14px] px-4 py-3.5 text-left"
                  >
                    {g.icon && <span className="text-lg">{g.icon}</span>}
                    <span className="flex-1 text-[14px] font-medium">{g.title}</span>
                    <ChevronRight size={15} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
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
  const { data: goals = [] } = useGoals();
  const markCheck = useMarkCheck(groupId);

  const [pickerKind, setPickerKind] = useState<GoalKind | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingGoal = useRef<Goal | null>(null);
  const pendingKind = useRef<OptionKind | null>(null);

  function handleOption(kind: OptionKind) {
    setUploadError(null);
    if (kind === "gym") {
      pendingKind.current = "gym";
      pendingGoal.current = null;
      fileRef.current?.click();
    } else {
      setPickerKind(kind as GoalKind);
      setPickerOpen(true);
    }
  }

  function handleGoalPicked(goal: Goal) {
    setPickerOpen(false);
    pendingKind.current = goal.kind;
    pendingGoal.current = goal;
    setTimeout(() => fileRef.current?.click(), 300);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!groupId) { setUploadError("Sin grupo activo"); return; }
    if (!pendingKind.current) { setUploadError("Selecciona el tipo primero"); return; }
    e.target.value = "";
    try {
      await markCheck.mutateAsync({
        file,
        kind: pendingKind.current as GoalKind,
        goalId: pendingGoal.current?.id,
      });
      onClose();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir la foto");
    }
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[70]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[80] bg-[#0e0e0e] rounded-t-[26px] outline-none">
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-[#2a2a2a] mx-auto mt-3" />

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
                {OPTIONS.map(({ kind, label, desc, color, tint, Icon }) => (
                  <button
                    key={kind}
                    onClick={() => handleOption(kind)}
                    disabled={markCheck.isPending}
                    className="flex items-center gap-3 bg-[#161616] border border-[#232323] rounded-[16px] px-4 py-3.5 text-left transition-opacity disabled:opacity-40"
                  >
                    {/* Icon box */}
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: tint }}
                    >
                      <Icon size={20} strokeWidth={1.5} style={{ color }} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 leading-snug">
                      <p className="text-[14px] font-medium">{label}</p>
                      <p className="text-[11px] text-[var(--color-muted)]">{desc}</p>
                    </div>

                    {/* Camera */}
                    <Camera size={18} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                  </button>
                ))}
              </div>

              {uploadError && (
                <p className="mt-4 text-[12px] text-red-400 text-center">{uploadError}</p>
              )}

              {/* Footer note */}
              <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-[#555]">
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
        onPick={handleGoalPicked}
        onClose={() => setPickerOpen(false)}
      />

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </>
  );
}
