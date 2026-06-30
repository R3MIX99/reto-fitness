"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";

// Reproductor de audio nativo (Web Audio): descarga el archivo, lo decodifica a
// un AudioBuffer y lo reproduce con waveform + play/pausa. Más confiable que
// <audio controls> para las grabaciones webm/opus de MediaRecorder, que en
// muchos Android/Samsung no traen duración y no se reproducen con el reproductor
// nativo. Mismo enfoque que el preview de AudioRecorder.

const BARS = 36;

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

// Forma de onda a partir del AudioBuffer: RMS por ventana, normalizado.
function buildWaveform(buffer: AudioBuffer, n: number): number[] {
  const data = buffer.getChannelData(0);
  const win = Math.floor(data.length / n) || 1;
  const out: number[] = [];
  let max = 0.0001;
  for (let i = 0; i < n; i++) {
    const start = i * win;
    let sum = 0;
    let count = 0;
    for (let j = start; j < start + win && j < data.length; j++) {
      sum += data[j] * data[j];
      count++;
    }
    const rms = count > 0 ? Math.sqrt(sum / count) : 0;
    out.push(rms);
    if (rms > max) max = rms;
  }
  return out.map((v) => Math.min(1, Math.max(0.08, v / max)));
}

export function AudioPlayer({ url }: { url: string | null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bars, setBars] = useState<number[]>(() => new Array(BARS).fill(0.12));

  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef(0);      // ctx.currentTime cuando empezó (menos offset)
  const offsetRef = useRef(0);         // segundos reproducidos (para pausa)
  const manualStopRef = useRef(false); // distingue stop manual de fin natural
  const rafRef = useRef<number | null>(null);

  const stopRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Descarga + decodifica al cambiar la URL.
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setPlaying(false);
    setProgress(0);
    offsetRef.current = 0;
    (async () => {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = ctxRef.current ?? new Ctx();
        ctxRef.current = ctx;
        const decoded = await ctx.decodeAudioData(buf.slice(0));
        if (cancelled) return;
        bufferRef.current = decoded;
        if (isFinite(decoded.duration) && decoded.duration > 0) setDuration(decoded.duration);
        setBars(buildWaveform(decoded, BARS));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // Limpieza al desmontar.
  useEffect(() => {
    return () => {
      stopRaf();
      try { sourceRef.current?.stop(); } catch { /* noop */ }
      sourceRef.current = null;
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    };
  }, [stopRaf]);

  function stopSource(manual: boolean) {
    if (sourceRef.current) {
      manualStopRef.current = manual;
      try { sourceRef.current.stop(); } catch { /* noop */ }
      sourceRef.current = null;
    }
    stopRaf();
  }

  function pause() {
    const ctx = ctxRef.current;
    if (ctx && sourceRef.current) {
      offsetRef.current = Math.max(0, ctx.currentTime - startedAtRef.current);
    }
    stopSource(true);
    setPlaying(false);
  }

  async function toggle() {
    if (playing) { pause(); return; }
    const ctx = ctxRef.current;
    const buffer = bufferRef.current;
    if (!ctx || !buffer) return;
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
        offsetRef.current = 0;
        setPlaying(false);
        setProgress(0);
        stopRaf();
      };
      src.start(0, offset);
      sourceRef.current = src;
      startedAtRef.current = ctx.currentTime - offset;
      setPlaying(true);

      const tick = () => {
        const c = ctxRef.current;
        if (!c) return;
        const t = c.currentTime - startedAtRef.current;
        setProgress(total > 0 ? Math.min(1, t / total) : 0);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setError(true);
    }
  }

  if (error) {
    return <p className="text-[12px] text-red-400">No se pudo reproducir el audio.</p>;
  }

  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: "var(--color-bg-card)" }}>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={loading}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-accent disabled:opacity-80"
        >
          {loading
            ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : playing
            ? <Pause size={15} strokeWidth={2} className="text-white" fill="white" />
            : <Play size={15} strokeWidth={2} className="text-white" fill="white" style={{ marginLeft: 1 }} />}
        </button>

        <Waveform bars={bars} progress={progress} color="var(--color-warm)" />

        <span className="text-[13px] tabular-nums text-[var(--color-muted)] flex-shrink-0 w-10 text-right">
          {fmt(playing || progress > 0 ? progress * duration : duration)}
        </span>
      </div>
    </div>
  );
}

function Waveform({ bars, progress, color }: { bars: number[]; progress: number; color: string }) {
  const filled = Math.round(progress * bars.length);
  return (
    <div className="flex-1 flex items-center gap-[2px] h-9 overflow-hidden">
      {bars.map((amp, i) => {
        const active = i < filled;
        return (
          <div
            key={i}
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
