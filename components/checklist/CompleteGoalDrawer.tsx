"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Camera, Timer, Play, Pause, RotateCcw, Check, Video } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { AudioRecorder } from "@/components/ui/AudioRecorder";
import type { Goal, CheckEvidence, ExtraFiles } from "@/lib/hooks/useChecklist";
import { compressImage } from "@/lib/hooks/useProfile";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Botón de foto instantánea (solo cámara)
function PhotoButton({ url, label, busy, onPick }: { url: string | null; label: string; busy?: boolean; onPick: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => { if (!busy && ref.current) { ref.current.value = ""; ref.current.click(); } }}
        className="flex-1 rounded-[14px] overflow-hidden flex items-center justify-center"
        style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)", minHeight: 120 }}>
        {url ? (
          <div className="relative w-full" style={{ height: 130 }}>
            <Image src={url} alt={label} fill className="object-cover" unoptimized />
          </div>
        ) : busy ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-[var(--color-muted)]">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-warm)] animate-spin" />
            <span className="text-[11px]">Preparando…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-6 text-[var(--color-muted)]">
            <Camera size={20} strokeWidth={1.5} />
            <span className="text-[11px]">{label}</span>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
    </>
  );
}

export function CompleteGoalDrawer({ open, onClose, goal, onSubmit }: {
  open: boolean; onClose: () => void; goal: Goal;
  onSubmit: (file: File, evidence: CheckEvidence, extraFiles?: ExtraFiles) => Promise<void>;
}) {
  const modules = goal.config?.modules ?? [];
  const timerMod = modules.includes("timer");
  const summaryMod = modules.includes("summary");
  const audioMod = modules.includes("audio");
  const videoMod = modules.includes("video");
  const baMod = modules.includes("before_after");
  // Meta de solo-video: el video es la evidencia principal (sin foto).
  const videoPrimary = videoMod && !baMod;
  const targetSec = (goal.config?.timer_minutes ?? 0) * 60;

  const [photo, setPhoto] = useState<File | null>(null);     // foto principal (o "antes")
  const [after, setAfter] = useState<File | null>(null);     // "después"
  const [audio, setAudio] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [urls, setUrls] = useState<{ photo?: string; after?: string }>({});
  const [summary, setSummary] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLInputElement>(null);

  // Comprimir al recibir cada foto: el preview y la subida usan la versión de
  // 1080px y el original de cámara (12MP+) se libera de inmediato (evita OOM).
  // Mientras corre, el botón muestra "Preparando…".
  const [busySlot, setBusySlot] = useState<"photo" | "after" | null>(null);
  const pickPhoto = async (f: File) => {
    setBusySlot("photo");
    try { setPhoto(await compressImage(f, 1080)); } finally { setBusySlot(null); }
  };
  const pickAfter = async (f: File) => {
    setBusySlot("after");
    try { setAfter(await compressImage(f, 1080)); } finally { setBusySlot(null); }
  };

  useEffect(() => {
    if (open) { setPhoto(null); setAfter(null); setAudio(null); setVideo(null); setSummary(""); setElapsed(0); setRunning(false); setError(null); }
  }, [open]);

  // Previews (object URLs) — el audio gestiona su propia URL en AudioRecorder
  useEffect(() => {
    const next: { photo?: string; after?: string } = {};
    if (photo) next.photo = URL.createObjectURL(photo);
    if (after) next.after = URL.createObjectURL(after);
    setUrls(next);
    return () => Object.values(next).forEach((u) => u && URL.revokeObjectURL(u));
  }, [photo, after]);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(i);
  }, [running]);

  const timerDone = targetSec > 0 && elapsed >= targetSec;
  // En modo video-primario no se pide foto; el propio video es la evidencia.
  const photoOk = videoPrimary ? !!video : baMod ? (!!photo && !!after) : !!photo;
  const canSubmit = photoOk
    && (!summaryMod || summary.trim().length > 0)
    && (!timerMod || elapsed > 0)
    && (!audioMod || !!audio)
    && (videoPrimary || !videoMod || !!video);

  async function submit() {
    const mainFile = videoPrimary ? video : photo;
    if (!mainFile) return;
    setSubmitting(true); setError(null);
    try {
      const evidence: CheckEvidence = {};
      if (summaryMod && summary.trim()) evidence.summary = summary.trim();
      if (timerMod) evidence.timer_seconds = elapsed;
      const extraFiles: ExtraFiles = {};
      if (baMod && after) extraFiles.after = after;
      if (audioMod && audio) extraFiles.audio = audio;
      // Solo se sube como archivo extra cuando el video NO es el principal.
      if (!videoPrimary && videoMod && video) extraFiles.video = video;
      await onSubmit(mainFile, evidence, extraFiles);
      onClose();
    } catch (e) {
      setError("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-semibold text-[18px] text-center mb-4">{goal.title}</p>

        {/* Evidencia principal: video, antes/después, o una sola foto */}
        {videoPrimary ? (
          <div className="flex mb-4">
            <button onClick={() => { if (videoRef.current) { videoRef.current.value = ""; videoRef.current.click(); } }}
              className="flex-1 rounded-[14px] overflow-hidden flex items-center justify-center"
              style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)", minHeight: 120 }}>
              <div className="flex flex-col items-center gap-1.5 py-6" style={{ color: video ? "#22c55e" : "var(--color-muted)" }}>
                {video ? <Check size={20} strokeWidth={2} /> : <Video size={20} strokeWidth={1.5} />}
                <span className="text-[11px]">{video ? "Video listo · tocar para regrabar" : "Grabar video"}</span>
              </div>
            </button>
            <input ref={videoRef} type="file" accept="video/*" capture className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideo(f); }} />
          </div>
        ) : baMod ? (
          <div className="flex gap-2.5 mb-4">
            <PhotoButton url={urls.photo ?? null} label="Antes" busy={busySlot === "photo"} onPick={(f) => void pickPhoto(f)} />
            <PhotoButton url={urls.after ?? null} label="Después" busy={busySlot === "after"} onPick={(f) => void pickAfter(f)} />
          </div>
        ) : (
          <div className="flex mb-4">
            <PhotoButton url={urls.photo ?? null} label="Tomar foto (instantánea)" busy={busySlot === "photo"} onPick={(f) => void pickPhoto(f)} />
          </div>
        )}

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

        {/* Audio: grabador nativo (estilo WhatsApp) */}
        {audioMod && (
          <div className="mb-4">
            <AudioRecorder value={audio} onChange={setAudio} />
          </div>
        )}

        {/* Video (fila secundaria; en modo video-primario ya es la evidencia principal) */}
        {videoMod && !videoPrimary && (
          <div className="rounded-[14px] px-3.5 py-3 mb-4" style={{ background: "var(--color-surface)" }}>
            <button onClick={() => { if (videoRef.current) { videoRef.current.value = ""; videoRef.current.click(); } }}
              className="w-full flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: video ? "rgba(34,197,94,0.15)" : "rgba(239,200,139,0.15)" }}>
                {video ? <Check size={16} strokeWidth={2} className="text-green-400" /> : <Video size={16} strokeWidth={1.5} className="text-warm" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-[13px]">{video ? "Video listo" : "Grabar o subir video"}</p>
                <p className="text-[11px] text-[var(--color-muted)] truncate">{video ? video.name : "Toca para grabar"}</p>
              </div>
            </button>
            <input ref={videoRef} type="file" accept="video/*" capture className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setVideo(f); }} />
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
            Completa todos los módulos de la meta para guardar.
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
