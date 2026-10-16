"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, SwitchCamera, Zap, ZapOff, CameraOff } from "lucide-react";
import { markCompressed } from "@/lib/hooks/useProfile";

// Lado largo máximo de la foto final: igual que el resto de la app (1080px).
const MAX_SIZE = 1080;

type Facing = "environment" | "user";
type TorchCaps = MediaTrackCapabilities & { torch?: boolean };

interface CameraViewProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CameraView({ onCapture, onCancel }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedOnce = useRef(false);

  const [facing, setFacing] = useState<Facing>("environment");
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(
    () => typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia
  );
  const [canFlip, setCanFlip] = useState(false);
  const [torchOk, setTorchOk] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [shooting, setShooting] = useState(false);
  // Se incrementa al volver de segundo plano para reabrir la cámara.
  const [resumeKey, setResumeKey] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Abre (o reabre) la cámara cuando cambia el lado o se vuelve a la app.
  useEffect(() => {
    if (unavailable) return;
    let cancelled = false;
    setReady(false);
    stopStream(); // algunos teléfonos no abren dos cámaras a la vez

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => { /* autoplay lo resuelve playsInline */ });
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as TorchCaps;
        setTorchOk(!!caps.torch);
        setTorchOn(false);
        startedOnce.current = true;
        setReady(true);
        navigator.mediaDevices
          .enumerateDevices()
          .then((d) => { if (!cancelled) setCanFlip(d.filter((x) => x.kind === "videoinput").length > 1); })
          .catch(() => { /* sin lista: no mostramos el botón */ });
      } catch {
        if (cancelled) return;
        if (startedOnce.current) {
          // Falló al cambiar de cámara (p. ej. solo hay una): volvemos a la anterior.
          setCanFlip(false);
          setFacing((f) => (f === "user" ? "environment" : "user"));
        } else {
          setUnavailable(true); // permiso denegado o sin cámara → panel de respaldo
        }
      }
    })();

    return () => { cancelled = true; };
  }, [facing, resumeKey, unavailable, stopStream]);

  // Libera la cámara al desmontar y cuando la app pasa a segundo plano.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stopStream();
        setReady(false);
      } else {
        setResumeKey((k) => k + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stopStream();
    };
  }, [stopStream]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchOk(false);
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !ready || shooting) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    setShooting(true);
    try {
      const ratio = Math.min(1, MAX_SIZE / Math.max(vw, vh));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * ratio);
      canvas.height = Math.round(vh * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) throw new Error("blob");
      const file = new File([blob], `evidencia-${Date.now()}.jpg`, { type: "image/jpeg" });
      markCompressed(file, MAX_SIZE);
      stopStream();
      onCapture(file);
    } catch {
      setShooting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] flex flex-col bg-black text-white"
      // Los drawers (vaul/Radix) bloquean el puntero fuera de ellos y se cierran al
      // tocar fuera: este overlay vive fuera del drawer, así que lo aislamos.
      style={{ pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Cámara"
    >
      {unavailable ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <CameraOff size={40} strokeWidth={1.5} className="text-white/60" />
          <p className="font-display font-medium text-[17px]">No pudimos abrir la cámara</p>
          <p className="text-[13px] text-white/60">
            Revisa el permiso de cámara del navegador, o usa la cámara del sistema.
          </p>
          <label className="mt-2 rounded-full px-6 py-3 text-[14px] font-medium cursor-pointer bg-accent text-white">
            Usar cámara del sistema
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                onCapture(file);
              }}
            />
          </label>
          <button onClick={onCancel} className="text-[13px] text-white/60 py-2">
            Cancelar
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
          />

          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}

          {/* Barra superior */}
          <div
            className="relative z-10 flex items-center justify-between px-4"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
          >
            <button
              onClick={onCancel}
              aria-label="Cerrar cámara"
              className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
            {torchOk && (
              <button
                onClick={toggleTorch}
                aria-label={torchOn ? "Apagar linterna" : "Encender linterna"}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40"
              >
                {torchOn
                  ? <Zap size={20} strokeWidth={1.5} fill="#EFC88B" className="text-warm" />
                  : <ZapOff size={20} strokeWidth={1.5} />}
              </button>
            )}
          </div>

          <div className="flex-1" />

          {/* Barra inferior */}
          <div
            className="relative z-10 flex items-center justify-between px-10"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)" }}
          >
            <div className="w-12 h-12" />
            <button
              onClick={capture}
              disabled={!ready || shooting}
              aria-label="Tomar foto"
              className="w-[76px] h-[76px] rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
              style={{ border: "4px solid #fff" }}
            >
              <span className="w-[58px] h-[58px] rounded-full bg-white block" />
            </button>
            {canFlip ? (
              <button
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
                disabled={!ready}
                aria-label="Cambiar cámara"
                className="w-12 h-12 rounded-full flex items-center justify-center bg-black/40 disabled:opacity-40"
              >
                <SwitchCamera size={22} strokeWidth={1.5} />
              </button>
            ) : (
              <div className="w-12 h-12" />
            )}
          </div>
        </>
      )}
    </div>
  );
}
