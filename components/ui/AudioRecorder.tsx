"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, Square, Play, Pause, Trash2, X } from "lucide-react";

// Grabador de audio nativo (estilo WhatsApp): graba dentro de la app con
// MediaRecorder, muestra ondas en vivo mientras hablas y un mini-reproductor
// con play/pausa, progreso y borrar. Evita el <input capture> de iOS/Android
// que genera archivos sin duración.

const BARS = 36;       // barras del audio ya grabado (forma estática)
const LIVE_BARS = 9;   // barras fijas del ecualizador en vivo (estilo asistente de voz)

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  // Probador de reproducción: preferimos un formato que el dispositivo pueda
  // GRABAR y además REPRODUCIR (algunos Android graban webm pero no lo decodifican).
  let probe: HTMLAudioElement | null = null;
  try { probe = document.createElement("audio"); } catch { probe = null; }
  const canPlay = (t: string) => {
    if (!probe) return true;
    const base = t.split(";")[0];
    return probe.canPlayType(t) !== "" || probe.canPlayType(base) !== "";
  };
  const types = ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  // 1ª pasada: grabable Y reproducible.
  for (const t of types) {
    try { if (MediaRecorder.isTypeSupported(t) && canPlay(t)) return t; } catch { /* noop */ }
  }
  // 2ª pasada: al menos grabable (la previa puede fallar, pero se guarda igual).
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
  const [decoding, setDecoding] = useState(false);    // procesando el audio grabado
  const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0.08));            // grabado (estático)
  const [liveBars, setLiveBars] = useState<number[]>(() => new Array(LIVE_BARS).fill(0.12)); // ecualizador en vivo
  const prevLevelsRef = useRef<number[]>(new Array(LIVE_BARS).fill(0.12));

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

  // Reproducción (Web Audio: decodifica el blob y lo reproduce; más confiable
  // que <audio> con grabaciones webm sin duración en el contenedor).
  const playCtxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef(0);        // ctx.currentTime cuando empezó (menos offset)
  const offsetRef = useRef(0);           // segundos reproducidos (para pausa)
  const manualStopRef = useRef(false);   // distingue stop manual de fin natural
  const playRafRef = useRef<number | null>(null);

  const stopPlayRaf = useCallback(() => {
    if (playRafRef.current) cancelAnimationFrame(playRafRef.current);
    playRafRef.current = null;
  }, []);

  const stopMeter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Ecualizador en vivo: barras FIJAS (no se desplazan) que crecen/encogen con
  // la voz, más altas al centro y más cortas a los lados (estilo asistente de
  // voz). Se suaviza con interpolación para que no titile.
  const lastBarAtRef = useRef(0);
  const startMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    const prev = prevLevelsRef.current;
    lastBarAtRef.current = 0;
    const mid = (LIVE_BARS - 1) / 2;
    const tick = (now: number) => {
      analyser.getByteFrequencyData(freq);
      let total = 0;
      const targets: number[] = new Array(LIVE_BARS);
      for (let i = 0; i < LIVE_BARS; i++) {
        // Cada barra mapea a una banda de frecuencia (graves al centro).
        const bin = Math.max(1, Math.floor(((i + 1) / (LIVE_BARS + 1)) * (freq.length * 0.55)));
        const val = freq[bin] / 255;
        total += val;
        // Peso central: 1 al centro, ~0.4 en los extremos.
        const d = Math.abs(i - mid) / mid;
        const weight = 1 - 0.6 * d;
        targets[i] = Math.min(1, Math.max(0.1, val * 1.9 * weight));
      }
      // Suavizado (lerp) hacia el objetivo.
      for (let i = 0; i < LIVE_BARS; i++) {
        prev[i] = prev[i] + (targets[i] - prev[i]) * 0.4;
      }
      setLiveBars(prev.slice());

      // Para la forma de onda del audio ya grabado: guardar amplitud cada ~110ms.
      if (now - lastBarAtRef.current >= 110) {
        lastBarAtRef.current = now;
        ampHistory.current.push(Math.min(1, Math.max(0.1, (total / LIVE_BARS) * 1.9)));
      }
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
    return () => {
      teardownRecording();
      stopPlayRaf();
      try { sourceRef.current?.stop(); } catch { /* noop */ }
      sourceRef.current = null;
      if (playCtxRef.current) { playCtxRef.current.close().catch(() => {}); playCtxRef.current = null; }
    };
  }, [teardownRecording, stopPlayRaf]);

  // Decodifica el archivo a un AudioBuffer para reproducirlo con Web Audio.
  // También obtiene la duración real (los webm de MediaRecorder no la traen).
  useEffect(() => {
    if (!value) { bufferRef.current = null; setDecoding(false); return; }
    let cancelled = false;
    bufferRef.current = null;
    setDecoding(true);
    (async () => {
      try {
        const buf = await value.arrayBuffer();
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = playCtxRef.current ?? new Ctx();
        playCtxRef.current = ctx;
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        if (cancelled) return;
        bufferRef.current = decoded;
        offsetRef.current = 0;
        if (isFinite(decoded.duration) && decoded.duration > 0) setDuration(decoded.duration);
      } catch {
        if (!cancelled) bufferRef.current = null; // se usará la duración del cronómetro
      } finally {
        if (!cancelled) setDecoding(false);
      }
    })();
    return () => { cancelled = true; };
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
      prevLevelsRef.current = new Array(LIVE_BARS).fill(0.12);
      setLiveBars(new Array(LIVE_BARS).fill(0.12));
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

  function stopSource(manual: boolean) {
    if (sourceRef.current) {
      manualStopRef.current = manual;
      try { sourceRef.current.stop(); } catch { /* noop */ }
      sourceRef.current = null;
    }
    stopPlayRaf();
  }

  function pausePlayback() {
    const ctx = playCtxRef.current;
    if (ctx && sourceRef.current) {
      offsetRef.current = Math.max(0, ctx.currentTime - startedAtRef.current);
    }
    stopSource(true);
    setPlaying(false);
  }

  function discard() {
    pausePlayback();
    offsetRef.current = 0;
    setProgress(0);
    setBars(new Array(BARS).fill(0.08));
    onChange(null);
    setPhase("idle");
  }

  async function togglePlay() {
    if (playing) { pausePlayback(); return; }
    const ctx = playCtxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer) {
      setError("Aún se está procesando el audio… intenta de nuevo en un segundo.");
      return;
    }
    setError(null);
    try {
      await ctx.resume();
      const total = isFinite(buffer.duration) ? buffer.duration : duration;
      let offset = offsetRef.current;
      if (offset >= total - 0.05) offset = 0; // reiniciar si terminó
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => {
        if (manualStopRef.current) { manualStopRef.current = false; return; }
        // Fin natural
        offsetRef.current = 0;
        setPlaying(false);
        setProgress(0);
        stopPlayRaf();
      };
      src.start(0, offset);
      sourceRef.current = src;
      startedAtRef.current = ctx.currentTime - offset;
      setPlaying(true);

      const tick = () => {
        const c = playCtxRef.current;
        if (!c) return;
        const t = c.currentTime - startedAtRef.current;
        setProgress(total > 0 ? Math.min(1, t / total) : 0);
        playRafRef.current = requestAnimationFrame(tick);
      };
      playRafRef.current = requestAnimationFrame(tick);
    } catch {
      setError("No se pudo reproducir el audio en este dispositivo. Guárdalo igual: la evidencia sí queda registrada.");
    }
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

          <LiveEqualizer levels={liveBars} color={paused ? "var(--color-muted)" : "var(--color-accent)"} />

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
          <button onClick={togglePlay} disabled={decoding}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-accent disabled:opacity-80">
            {decoding
              ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : playing
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

// ── Ecualizador en vivo (barras fijas, crecen con la voz) ───────────────────

function LiveEqualizer({ levels, color }: { levels: number[]; color: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-[3px] h-9">
      {levels.map((v, i) => (
        <div key={i}
          className="rounded-full transition-[height] duration-100 ease-out"
          style={{ width: 4, height: `${Math.max(12, v * 100)}%`, background: color }}
        />
      ))}
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
