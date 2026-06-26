"use client";

import { useState, useRef } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { useCreateChallenge, type Recurrence } from "@/lib/hooks/useChallenges";

const WEEKDAYS = [
  { v: 1, l: "Lun" }, { v: 2, l: "Mar" }, { v: 3, l: "Mié" }, { v: 4, l: "Jue" },
  { v: 5, l: "Vie" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];
const RECURRENCES: { v: Recurrence; l: string }[] = [
  { v: "weekly", l: "Semanal" }, { v: "monthly", l: "Mensual" },
  { v: "once", l: "Una vez" }, { v: "daily", l: "Diario" },
];

export function CreateChallengeDrawer({ open, onClose, groupId, onCreated }: { open: boolean; onClose: () => void; groupId: string; onCreated?: () => void }) {
  const create = useCreateChallenge();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("weekly");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set([1]));
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [points, setPoints] = useState(3);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle(""); setDesc(""); setRecurrence("weekly"); setWeekdays(new Set([1]));
    setDayOfMonth(1); setDate(""); setTime(""); setPoints(3); setError(null);
  }

  // ── Selección de días con swipe (arrastrar para pintar/despintar) ──
  const dragRef = useRef<{ anchor: number; mode: "add" | "remove"; base: Set<number> } | null>(null);

  function idxFromPoint(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest("[data-day-idx]") as HTMLElement | null;
    return el ? Number(el.dataset.dayIdx) : null;
  }
  function applyRange(anchor: number, j: number, mode: "add" | "remove", base: Set<number>) {
    const lo = Math.min(anchor, j), hi = Math.max(anchor, j);
    const next = new Set(base);
    for (let i = lo; i <= hi; i++) {
      const v = WEEKDAYS[i].v;
      if (mode === "add") next.add(v); else next.delete(v);
    }
    setWeekdays(next);
  }
  function onDayPointerDown(e: React.PointerEvent) {
    const idx = idxFromPoint(e.clientX, e.clientY);
    if (idx == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const base = new Set(weekdays);
    const mode: "add" | "remove" = weekdays.has(WEEKDAYS[idx].v) ? "remove" : "add";
    dragRef.current = { anchor: idx, mode, base };
    applyRange(idx, idx, mode, base);
  }
  function onDayPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const j = idxFromPoint(e.clientX, e.clientY);
    if (j == null) return;
    const { anchor, mode, base } = dragRef.current;
    applyRange(anchor, j, mode, base);
  }
  function endDrag() { dragRef.current = null; }

  async function submit() {
    if (!title.trim()) { setError("Ponle un nombre al reto"); return; }
    if (recurrence === "weekly" && weekdays.size === 0) { setError("Elige al menos un día"); return; }
    if (recurrence === "once" && !date) { setError("Elige la fecha del reto"); return; }
    setError(null);
    try {
      await create.mutateAsync({
        groupId, title: title.trim(), description: desc.trim(), recurrence,
        weekdays: recurrence === "weekly" ? Array.from(weekdays).sort((a, b) => a - b) : null,
        dayOfMonth: recurrence === "monthly" ? dayOfMonth : null,
        challengeDate: recurrence === "once" ? date : null,
        atTime: time || null, points,
      });
      reset();
      onClose();
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el reto");
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-semibold text-[18px] text-center mb-4">Nuevo reto grupal</p>

        <label className="text-[12px] text-[var(--color-muted)]">Nombre</label>
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Correr 5 km juntos"
          className="w-full mt-1 mb-3 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        />

        <label className="text-[12px] text-[var(--color-muted)]">Descripción (opcional)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
          rows={1}
          placeholder="Detalles del reto"
          className="w-full mt-1 mb-3 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none resize-none overflow-hidden leading-snug"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", minHeight: 44 }}
        />

        <label className="text-[12px] text-[var(--color-muted)]">Frecuencia</label>
        <div className="grid grid-cols-4 gap-2 mt-1 mb-3">
          {RECURRENCES.map((r) => (
            <button
              key={r.v} onClick={() => setRecurrence(r.v)}
              className="rounded-[10px] py-2 text-[12px] font-medium transition-colors"
              style={{
                background: recurrence === r.v ? "var(--color-warm)" : "var(--color-surface)",
                color: recurrence === r.v ? "#1a1000" : "var(--color-muted)",
                border: recurrence === r.v ? "none" : "1px solid var(--color-border)",
              }}
            >{r.l}</button>
          ))}
        </div>

        {recurrence === "weekly" && (
          <>
            <p className="text-[11px] text-[var(--color-muted)] mb-1.5">Elige uno o varios días · puedes deslizar</p>
            <div
              className="grid grid-cols-7 gap-1.5 mb-3 select-none"
              style={{ touchAction: "none" }}
              onPointerDown={onDayPointerDown}
              onPointerMove={onDayPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {WEEKDAYS.map((d, i) => {
                const on = weekdays.has(d.v);
                return (
                  <div key={d.v} data-day-idx={i}
                    className="rounded-[9px] py-2 text-[11px] font-medium text-center transition-colors"
                    style={{
                      background: on ? "var(--color-warm)" : "var(--color-surface)",
                      color: on ? "#1a1000" : "var(--color-muted)",
                      border: on ? "none" : "1px solid var(--color-border)",
                    }}
                  >{d.l}</div>
                );
              })}
            </div>
          </>
        )}
        {recurrence === "monthly" && (
          <div className="mb-3">
            <label className="text-[12px] text-[var(--color-muted)]">Día del mes</label>
            <input type="number" min={1} max={31} value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
              className="w-full mt-1 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          </div>
        )}
        {recurrence === "once" && (
          <div className="mb-3">
            <label className="text-[12px] text-[var(--color-muted)]">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full mt-1 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="text-[12px] text-[var(--color-muted)]">Hora (opcional)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full mt-1 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          </div>
          <div className="w-[110px]">
            <label className="text-[12px] text-[var(--color-muted)]">Puntos</label>
            <input type="number" min={1} max={13} value={points}
              onChange={(e) => setPoints(Math.min(13, Math.max(1, Number(e.target.value))))}
              className="w-full mt-1 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}

        <button onClick={submit} disabled={create.isPending}
          className="w-full bg-warm text-accent-dark rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50">
          {create.isPending ? "Creando..." : "Crear reto"}
        </button>
      </div>
    </Drawer>
  );
}
