"use client";

import { useState, useEffect } from "react";
import { Trash2, Timer, AlignLeft, Crown } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import type { Goal, GoalKind, GoalConfig, GoalModule } from "@/lib/hooks/useChecklist";
import { usePlan } from "@/lib/hooks/usePlan";

interface GoalDrawerProps {
  open: boolean;
  goal?: Goal | null;
  defaultKind?: GoalKind;
  onClose: () => void;
  onSave: (data: { id?: string; title: string; kind: GoalKind; icon?: string; config?: GoalConfig | null }) => Promise<void>;
  onDelete?: (id: string) => void;
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-[42px] h-[24px] rounded-full flex-shrink-0 transition-colors relative"
      style={{ background: on ? "var(--color-warm)" : "var(--color-border)" }}
    >
      <span className="absolute top-[2px] w-5 h-5 rounded-full bg-white transition-all" style={{ left: on ? 20 : 2 }} />
    </button>
  );
}

export function GoalDrawer({ open, goal, defaultKind = "goal", onClose, onSave, onDelete }: GoalDrawerProps) {
  const { data: plan } = usePlan();
  const canCustomize = plan?.is_super_admin || plan?.tier === "pro" || plan?.tier === "elite";

  const [title, setTitle] = useState("");
  const [timerOn, setTimerOn] = useState(false);
  const [timerMin, setTimerMin] = useState(20);
  const [summaryOn, setSummaryOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(goal?.title ?? "");
    const mods = goal?.config?.modules ?? [];
    setTimerOn(mods.includes("timer"));
    setTimerMin(goal?.config?.timer_minutes ?? 20);
    setSummaryOn(mods.includes("summary"));
    setError(null);
  }, [goal, open]);

  function buildConfig(): GoalConfig | null {
    if (!canCustomize) return goal?.config ?? null; // no cambiar si no puede personalizar
    const modules: GoalModule[] = [];
    if (timerOn) modules.push("timer");
    if (summaryOn) modules.push("summary");
    if (modules.length === 0) return null;
    return { modules, ...(timerOn ? { timer_minutes: Math.max(1, timerMin) } : {}) };
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ id: goal?.id, title: title.trim(), kind: goal?.kind ?? defaultKind, config: buildConfig() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!goal?.id) return;
    setSaving(true);
    await onDelete?.(goal.id);
    setSaving(false);
    onClose();
  }

  return (
    <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--color-overlay)" }} />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[80] bg-[var(--color-bg-card)] rounded-t-[24px] outline-none" style={{ maxHeight: "92dvh" }}>
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>

          <div className="px-6 pb-10 pt-3 overflow-y-auto no-scrollbar" style={{ maxHeight: "calc(92dvh - 30px)" }}>
            <p className="text-[13px] text-[var(--color-muted)] mb-4">
              {goal ? "Editar" : "Nueva"} {defaultKind === "diet" ? "comida" : "meta"}
            </p>

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={defaultKind === "diet" ? "Ej. Almuerzo, cena, snack…" : "Ej. Leer 20 min"}
              className="w-full rounded-[12px] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--color-muted)] mb-4" style={{ background: "var(--color-surface)" }}
            />

            {/* Módulos de evidencia (Pro/Elite) */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[12px] text-[var(--color-muted)]">Evidencia de la meta</span>
                {!canCustomize && (
                  <span className="flex items-center gap-1 text-[10px] text-warm border border-warm/40 rounded-full px-2 py-0.5">
                    <Crown size={10} strokeWidth={1.5} /> Pro
                  </span>
                )}
              </div>

              <div className="rounded-[12px] px-3.5 py-1" style={{ background: "var(--color-surface)", opacity: canCustomize ? 1 : 0.55 }}>
                <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
                  <Timer size={15} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]">Cronómetro</p>
                    <p className="text-[11px] text-[var(--color-muted)]">Mide el tiempo (ej. leer 20 min)</p>
                  </div>
                  {timerOn && canCustomize && (
                    <input type="number" min={1} max={240} value={timerMin}
                      onChange={(e) => setTimerMin(Math.max(1, Number(e.target.value)))}
                      className="w-14 rounded-[8px] px-2 py-1 text-[13px] text-center outline-none mr-1"
                      style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }} />
                  )}
                  <Toggle on={timerOn} onChange={(v) => canCustomize && setTimerOn(v)} />
                </div>
                <div className="flex items-center gap-3 py-2.5">
                  <AlignLeft size={15} strokeWidth={1.5} className="text-warm flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px]">Resumen</p>
                    <p className="text-[11px] text-[var(--color-muted)]">Un texto de lo que hiciste</p>
                  </div>
                  <Toggle on={summaryOn} onChange={(v) => canCustomize && setSummaryOn(v)} />
                </div>
              </div>
              {!canCustomize && (
                <p className="text-[11px] text-[var(--color-muted)] mt-2">
                  Personaliza tus metas con cronómetro y resumen en el plan Pro o Elite.
                </p>
              )}
            </div>

            {error && <p className="text-[11px] text-red-400 mb-3">{error}</p>}

            <div className="flex gap-2">
              {goal && onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-red-400 flex-shrink-0" style={{ background: "var(--color-surface)" }}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex-1 bg-accent text-white rounded-full py-3 text-[14px] font-medium disabled:opacity-40 transition-opacity"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}
