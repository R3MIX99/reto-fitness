"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import type { Goal, GoalKind } from "@/lib/hooks/useChecklist";

interface GoalDrawerProps {
  open: boolean;
  goal?: Goal | null;
  defaultKind?: GoalKind;
  onClose: () => void;
  onSave: (data: { id?: string; title: string; kind: GoalKind; icon?: string }) => void;
  onDelete?: (id: string) => void;
}

export function GoalDrawer({ open, goal, defaultKind = "goal", onClose, onSave, onDelete }: GoalDrawerProps) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(goal?.title ?? "");
  }, [goal, open]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ id: goal?.id, title: title.trim(), kind: goal?.kind ?? defaultKind });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!goal?.id) return;
    setSaving(true);
    await onDelete?.(goal.id);
    setSaving(false);
    onClose();
  }

  return (
    <VaulDrawer.Root open={open} onOpenChange={(o) => !o && onClose()} shouldScaleBackground>
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 bg-black/60 z-[70]" />
        <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[80] bg-[var(--color-bg-card)] rounded-t-[24px] outline-none">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
          </div>

          <div className="px-6 pb-10 pt-3">
            <p className="text-[13px] text-[var(--color-muted)] mb-4">
              {goal ? "Editar" : "Nueva"} {goal?.kind === "diet" ? "comida" : "meta"}
            </p>

            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={goal?.kind === "diet" ? "Ej. Desayuno" : "Ej. Leer 20 min"}
              className="w-full bg-[#1a1a1a] rounded-[12px] px-4 py-3 text-[15px] outline-none placeholder:text-[var(--color-muted)] mb-4"
            />

            <div className="flex gap-2">
              {goal && onDelete && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center text-red-400 flex-shrink-0"
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
