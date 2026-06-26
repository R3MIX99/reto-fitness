"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, Play, Pause, Trash2, X } from "lucide-react";

// Grabador de audio nativo (estilo WhatsApp): graba dentro de la app con
// MediaRecorder, muestra ondas en vivo mientras hablas y un mini-reproductor
// con play/pausa, progreso y borrar. Evita el <input capture> de iOS/Android
// que genera archivos sin duración.

const BARS = 36;

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac", "audio/ogg"];
  for (const t of types) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch { /* noop */ }
  }
  return "";
}

function extFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("aac")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

type Phase = "idle" | "recording" | "recorded";

export function AudioRecorder({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>(value ? "recorded" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);          // segundos de grabación
  const [duration, setDuration] = useState(0);        // duración final (del cronómetro)
  const [paused, setPaused] = useState(false);        // grabación en pausa
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);        // 0..1 durante reproducción
  const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0.08));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Refs de grabación
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ampHistory = useRef<number[]>([]);            // amplitudes capturadas

  // Reproducción
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Bucle de medición: lee la amplitud del micrófono y mueve las ondas.
  const startMeter = useCallback(() => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const amp = Math.min(1, Math.max(0.06, rms * 2.4));
      ampHistory.current.push(amp);
      setBars((prev) => {
        const next = prev.slice(1);
        next.push(amp);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);
  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [stopTimer]);

  const teardownRecording = useCallback(() => {
    stopMeter();
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
  }, [stopMeter, stopTimer]);

  // Limpieza global al desmontar
  useEffect(() => {
    return () => { teardownRecording(); };
  }, [teardownRecording]);

  // La URL de reproducción se deriva del archivo (value). Reactiva: el <audio>
  // siempre recibe la fuente correcta tras grabar o al reabrir con audio previo.
  useEffect(() => {
    if (!value) { setAudioUrl(null); return; }
    const u = URL.createObjectURL(value);
    setAudioUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [value]);

  // Si el padre limpia el value (p. ej. al reabrir el drawer), volver a reposo
  useEffect(() => {
    if (!value && phase === "recorded") {
      setPhase("idle");
      setProgress(0);
      setPlaying(false);
      setBars(new Array(BARS).fill(0.08));
    }
  }, [value, phase]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      ampHistory.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const file = new File([blob], `nota.${extFor(type)}`, { type });
        // Forma de onda estática: muestrear la amplitud capturada a BARS barras
        setBars(downsample(ampHistory.current, BARS));
        onChange(file); // el efecto de value crea la URL de reproducción
        setPhase("recorded");
      };
      recorderRef.current = rec;

      // Web Audio para las ondas en vivo
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      rec.start();
      setElapsed(0);
      setPaused(false);
      setBars(new Array(BARS).fill(0.08));
      startMeter();
      startTimer();
      setPhase("recording");
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("Necesitamos permiso del micrófono. Actívalo en los ajustes del navegador.");
      } else if (name === "NotFoundError") {
        setError("No se encontró un micrófono en tu dispositivo.");
      } else {
        setError("No se pudo iniciar la grabación.");
      }
      teardownRecording();
      setPhase("idle");
    }
  }

  function stop() {
    setDuration(elapsed);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    teardownRecording();
    setPaused(false);
  }

  function pauseRec() {
    try { recorderRef.current?.pause(); } catch { /* noop */ }
    stopMeter();
    stopTimer();
    setPaused(true);
  }

  function resumeRec() {
    try { recorderRef.current?.resume(); } catch { /* noop */ }
    startMeter();
    startTimer();
    setPaused(false);
  }

  function cancelRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    teardownRecording();
    chunksRef.current = [];
    setPhase("idle");
    setElapsed(0);
    setPaused(false);
    setBars(new Array(BARS).fill(0.08));
  }

  function discard() {
    if (audioElRef.current) { audioElRef.current.pause(); }
    setPlaying(false);
    setProgress(0);
    setBars(new Array(BARS).fill(0.08));
    onChange(null); // el efecto de value revoca la URL
    setPhase("idle");
  }

  async function togglePlay() {
    const el = audioElRef.current;
    if (!el) return;
    if (playing || !el.paused) {
      el.pause();
      return;
    }
    setError(null);
    try {
      if (progress >= 1) { try { el.currentTime = 0; } catch { /* webm sin duración */ } }
      await el.play();
    } catch {
      setError("No se pudo reproducir el audio en este dispositivo.");
    }
  }

  // Progreso de reproducción basado en la duración del cronómetro (fiable para webm)
  function onTimeUpdate() {
    const el = audioElRef.current;
    if (!el || duration <= 0) return;
    setProgress(Math.min(1, el.currentTime / duration));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "recording") {
    return (
      <div className="rounded-[14px] px-3.5 py-3" style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3">
          <button onClick={cancelRecording}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <X size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          </button>

          <Waveform bars={bars} progress={1} live={!paused} color={paused ? "var(--color-muted)" : "var(--color-accent)"} />

          <span className="text-[13px] tabular-nums text-[var(--color-fg)] flex-shrink-0 w-10 text-right">{fmt(elapsed)}</span>

          {/* Pausar / reanudar la grabación */}
          <button onClick={paused ? resumeRec : pauseRec}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            {paused
              ? <Mic size={15} strokeWidth={1.5} className="text-warm" />
              : <Pause size={15} strokeWidth={2} className="text-warm" fill="currentColor" />}
          </button>

          {/* Finalizar */}
          <button onClick={stop}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-accent">
            <Square size={14} strokeWidth={2} className="text-white" fill="white" />
          </button>
        </div>
        <p className="text-[10px] mt-2 flex items-center gap-1.5" style={{ color: paused ? "var(--color-muted)" : "var(--color-accent)" }}>
          <span className={`w-1.5 h-1.5 rounded-full ${paused ? "" : "animate-pulse"}`} style={{ background: paused ? "var(--color-muted)" : "var(--color-accent)" }} />
          {paused ? "En pausa" : "Grabando…"}
        </p>
      </div>
    );
  }

  if (phase === "recorded") {
    return (
      <div className="rounded-[14px] px-3.5 py-3" style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3">
          <button onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-accent">
            {playing
              ? <Pause size={15} strokeWidth={2} className="text-white" fill="white" />
              : <Play size={15} strokeWidth={2} className="text-white" fill="white" style={{ marginLeft: 1 }} />}
          </button>

          <Waveform bars={bars} progress={progress} color="var(--color-warm)" />

          <span className="text-[13px] tabular-nums text-[var(--color-muted)] flex-shrink-0 w-10 text-right">
            {fmt(playing || progress > 0 ? Math.round(progress * duration) : duration)}
          </span>

          <button onClick={discard}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
            <Trash2 size={15} strokeWidth={1.5} className="text-red-400" />
          </button>
        </div>

        <audio
          ref={audioElRef}
          src={audioUrl ?? undefined}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          className="hidden"
        />
        {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
      </div>
    );
  }

  // idle
  return (
    <div>
      <button onClick={start}
        className="w-full rounded-[14px] px-3.5 py-3 flex items-center gap-3"
        style={{ background: "var(--color-surface)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(239,200,139,0.15)" }}>
          <Mic size={16} strokeWidth={1.5} className="text-warm" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[13px]">Grabar nota de voz</p>
          <p className="text-[11px] text-[var(--color-muted)]">Toca para empezar a grabar</p>
        </div>
      </button>
      {error && <p className="text-[11px] text-red-400 mt-2">{error}</p>}
    </div>
  );
}

// ── Forma de onda ────────────────────────────────────────────────────────────

function Waveform({ bars, progress, live, color }: { bars: number[]; progress: number; live?: boolean; color: string }) {
  const filled = Math.round(progress * bars.length);
  return (
    <div className="flex-1 flex items-center gap-[2px] h-9 overflow-hidden">
      {bars.map((amp, i) => {
        const active = live || i < filled;
        return (
          <div key={i}
            className="flex-1 rounded-full transition-[height] duration-75"
            style={{
              height: `${Math.max(8, amp * 100)}%`,
              minWidth: 2,
              background: active ? color : "var(--color-border)",
              opacity: active ? 1 : 0.6,
            }}
          />
        );
      })}
    </div>
  );
}

// Reduce una serie de amplitudes a n barras promediando ventanas.
function downsample(arr: number[], n: number): number[] {
  if (arr.length === 0) return new Array(n).fill(0.1);
  const out: number[] = [];
  const win = arr.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * win);
    const end = Math.max(start + 1, Math.floor((i + 1) * win));
    let sum = 0;
    for (let j = start; j < end && j < arr.length; j++) sum += arr[j];
    out.push(Math.min(1, Math.max(0.1, sum / (end - start))));
  }
  return out;
}
