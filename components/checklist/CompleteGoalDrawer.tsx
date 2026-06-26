"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Camera, Timer, Play, Pause, RotateCcw, Check } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { PhotoSourceDrawer } from "./PhotoSourceDrawer";
import type { Goal, CheckEvidence } from "@/lib/hooks/useChecklist";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Completar una meta personalizable: foto (siempre) + cronómetro y/o resumen.
export function CompleteGoalDrawer({ open, onClose, goal, onSubmit }: {
  open: boolean; onClose: () => void; goal: Goal;
  onSubmit: (file: File, evidence: CheckEvidence) => Promise<void>;
}) {
  const modules = goal.config?.modules ?? [];
  const timerMod = modules.includes("timer");
  const summaryMod = modules.includes("summary");
  const targetSec = (goal.config?.timer_minutes ?? 0) * 60;

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setPhoto(null); setSummary(""); setElapsed(0); setRunning(false); setError(null); }
  }, [open]);

  useEffect(() => {
    if (!photo) { setPhotoUrl(null); return; }
    const u = URL.createObjectURL(photo);
    setPhotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  const timerDone = targetSec > 0 && elapsed >= targetSec;
  const canSubmit = !!photo && (!summaryMod || summary.trim().length > 0) && (!timerMod || elapsed > 0);

  async function submit() {
    if (!photo) return;
    setSubmitting(true); setError(null);
    try {
      const evidence: CheckEvidence = {};
      if (summaryMod && summary.trim()) evidence.summary = summary.trim();
      if (timerMod) evidence.timer_seconds = elapsed;
      await onSubmit(photo, evidence);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-semibold text-[18px] text-center mb-4">{goal.title}</p>

        {/* Foto (siempre) */}
        <button onClick={() => setSourceOpen(true)} className="w-full rounded-[14px] mb-4 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)", minHeight: 120 }}>
          {photoUrl ? (
            <div className="relative w-full" style={{ height: 160 }}>
              <Image src={photoUrl} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-6 text-[var(--color-muted)]">
              <Camera size={22} strokeWidth={1.5} />
              <span className="text-[12px]">Tomar foto o elegir de galería</span>
            </div>
          )}
        </button>
        <PhotoSourceDrawer open={sourceOpen} onClose={() => setSourceOpen(false)}
          onFileSelected={(f) => { setPhoto(f); setSourceOpen(false); }}
          title="Evidencia de la meta" subtitle="Toma una foto o elige una de tu galería" />

        {/* Cronómetro */}
        {timerMod && (
          <div className="rounded-[14px] p-4 mb-4 text-center" style={{ background: "var(--color-surface)" }}>
            <div className="flex items-center justify-center gap-1.5 mb-2 text-[12px] text-[var(--color-muted)]">
              <Timer size={13} strokeWidth={1.5} /> Meta: {goal.config?.timer_minutes} min
            </div>
            <p className="font-display font-semibold text-[34px] leading-none" style={{ color: timerDone ? "#22c55e" : "var(--color-fg)" }}>{fmt(elapsed)}</p>
            <div className="flex justify-center gap-2 mt-3">
              <button onClick={() => setRunning((r) => !r)} className="flex items-center gap-1.5 rounded-pill px-4 py-2 text-[13px] font-medium" style={{ background: "var(--color-warm)", color: "#1a1000" }}>
                {running ? <><Pause size={14} strokeWidth={1.5} /> Pausar</> : <><Play size={14} strokeWidth={1.5} /> {elapsed > 0 ? "Seguir" : "Iniciar"}</>}
              </button>
              {elapsed > 0 && (
                <button onClick={() => { setRunning(false); setElapsed(0); }} className="flex items-center justify-center rounded-pill px-3 py-2" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                  <RotateCcw size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                </button>
              )}
            </div>
            {timerDone && <p className="text-[12px] text-green-400 mt-2 flex items-center justify-center gap-1"><Check size={13} strokeWidth={2} /> ¡Tiempo cumplido!</p>}
          </div>
        )}

        {/* Resumen */}
        {summaryMod && (
          <div className="mb-4">
            <label className="text-[12px] text-[var(--color-muted)]">Resumen</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
              rows={2} placeholder="¿Qué hiciste? Cuéntalo brevemente."
              className="w-full mt-1 rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none resize-none overflow-hidden leading-snug"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", minHeight: 60 }} />
          </div>
        )}

        {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}
        {!canSubmit && (
          <p className="text-[11px] text-[var(--color-muted)] text-center mb-2">
            Sube la foto{summaryMod ? ", escribe el resumen" : ""}{timerMod ? " e inicia el cronómetro" : ""} para completar.
          </p>
        )}
        <button onClick={submit} disabled={!canSubmit || submitting}
          className="w-full bg-accent text-white rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50">
          {submitting ? "Guardando..." : "Completar meta"}
        </button>
      </div>
    </Drawer>
  );
}
