"use client";

import { useRef, useState, useEffect } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Camera, Clock, CheckCircle2, RefreshCw, X, Expand, XCircle } from "lucide-react";
import type { Goal, DailyCheck, GoalKind } from "@/lib/hooks/useChecklist";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

// ── Signed URL hook ────────────────────────────────────────────────────────

function useSignedUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setUrl(null); return; }
    let cancelled = false;
    createClient()
      .storage.from("evidencias")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data) setUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path]);
  return url;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function kindLabel(kind: string, goal?: Goal | null): string {
  if (kind === "gym") return "Ejercicio de hoy";
  return goal?.title ?? (kind === "diet" ? "Dieta" : "Meta");
}

// ── Photo modal (fullscreen, rendered outside drawer) ─────────────────────

interface PhotoModalProps {
  url: string;
  onClose: () => void;
}

function PhotoModal({ url, onClose }: PhotoModalProps) {
  return (
    <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center z-10"
        aria-label="Cerrar"
      >
        <X size={18} strokeWidth={1.5} className="text-white" />
      </button>
      <div className="relative w-full h-full" onClick={onClose}>
        <Image
          src={url}
          alt="Evidencia"
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

interface CheckDetailDrawerProps {
  open: boolean;
  goal: Goal | null;
  check: DailyCheck | null;
  onClose: () => void;
  onReplace: (file: File, kind: GoalKind, goalId?: string) => Promise<void>;
}

export function CheckDetailDrawer({ open, goal, check, onClose, onReplace }: CheckDetailDrawerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState(false);
  // photoUrl persists even after drawer closes so the modal can still show it
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const signedUrl = useSignedUrl(check?.evidence_path ?? null);

  useEffect(() => {
    if (signedUrl) setPhotoUrl(signedUrl);
  }, [signedUrl]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !check) return;
    e.target.value = "";
    setReplacing(true);
    try {
      await onReplace(file, check.kind as GoalKind, check.goal_id ?? undefined);
      onClose();
    } finally {
      setReplacing(false);
    }
  }

  function expandPhoto() {
    if (!photoUrl) return;
    onClose();       // close the drawer
    setPhotoOpen(true);
  }

  const title = kindLabel(check?.kind ?? "", goal);
  const status = check?.status;
  const isPending  = status === "pending";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  return (
    <>
      <VaulDrawer.Root
        open={open}
        onOpenChange={(o) => !o && onClose()}
        shouldScaleBackground
      >
        <VaulDrawer.Portal>
          <VaulDrawer.Overlay className="fixed inset-0 bg-black/60 z-[70]" />
          <VaulDrawer.Content className="fixed bottom-0 left-0 right-0 z-[80] bg-[#0e0e0e] rounded-t-[26px] outline-none flex flex-col">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-[17px] truncate">{title}</p>
                {check && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                    <span className="text-[12px] text-[var(--color-muted)]">
                      Completado a las {formatTime(check.created_at)}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {isPending && (
                  <span className="flex items-center gap-1 text-[10px] text-warm bg-warm/10 rounded-full px-2.5 py-1">
                    <Clock size={9} strokeWidth={1.5} />
                    En revisión
                  </span>
                )}
                {isApproved && (
                  <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 rounded-full px-2.5 py-1">
                    <CheckCircle2 size={9} strokeWidth={2} />
                    Aprobado
                  </span>
                )}
                {isRejected && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 rounded-full px-2.5 py-1">
                    <XCircle size={9} strokeWidth={2} />
                    Rechazado
                  </span>
                )}
                <button onClick={onClose} className="w-7 h-7 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <X size={14} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                </button>
              </div>
            </div>

            {/* Evidence photo */}
            <div className="px-5 pb-8">
              <div className="relative rounded-[18px] overflow-hidden bg-[#1a1a1a] mb-4 aspect-square w-full max-w-[260px] mx-auto">
                {signedUrl ? (
                  <>
                    <button
                      onClick={expandPhoto}
                      className="absolute inset-0 w-full h-full"
                      aria-label="Ver foto completa"
                    >
                      <Image
                        src={signedUrl}
                        alt="Evidencia"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                    <button
                      onClick={expandPhoto}
                      className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none"
                    >
                      <Expand size={13} strokeWidth={1.5} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[260px]">
                    <div className="w-8 h-8 border-2 border-[#2a2a2a] border-t-warm rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Replace button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={replacing}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] text-[var(--color-fg)] rounded-full py-3 text-[14px] disabled:opacity-50"
              >
                {replacing ? (
                  <RefreshCw size={15} strokeWidth={1.5} className="animate-spin text-[var(--color-muted)]" />
                ) : (
                  <Camera size={15} strokeWidth={1.5} />
                )}
                {replacing ? "Subiendo…" : "Cambiar foto"}
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFile}
            />
          </VaulDrawer.Content>
        </VaulDrawer.Portal>
      </VaulDrawer.Root>

      {/* Fullscreen photo modal — rendered outside drawer so it covers everything */}
      {photoOpen && photoUrl && (
        <PhotoModal url={photoUrl} onClose={() => setPhotoOpen(false)} />
      )}
    </>
  );
}
