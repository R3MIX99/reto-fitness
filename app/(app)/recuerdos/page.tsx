"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronDown, Bookmark, Timer, AlignLeft, Mic,
  Video as VideoIcon, ImageIcon, X, Dumbbell, UtensilsCrossed, Target, Maximize2, Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMemoriesList, useRemoveMemoryById, type Memory } from "@/lib/hooks/useMemories";
import { AudioPlayer } from "@/components/ui/AudioPlayer";
import { isVideoPath } from "@/lib/hooks/useChecklist";

// ── Helpers ────────────────────────────────────────────────────────────────

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function useSignedUrl(path: string | null | undefined, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path || !enabled) return;
    let cancelled = false;
    createClient()
      .storage.from("evidencias")
      .createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path, enabled]);
  return url;
}

function KindBadge({ kind }: { kind: string | null }) {
  if (kind === "gym") return (
    <span className="flex items-center gap-1 text-[11px] text-accent border border-accent/40 rounded-full px-2 py-0.5">
      <Dumbbell size={10} strokeWidth={1.5} /> Gimnasio
    </span>
  );
  if (kind === "diet") return (
    <span className="flex items-center gap-1 text-[11px] text-warm border border-warm/30 rounded-full px-2 py-0.5">
      <UtensilsCrossed size={10} strokeWidth={1.5} /> Dieta
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] rounded-full px-2 py-0.5" style={{ border: "1px solid var(--color-border)" }}>
      <Target size={10} strokeWidth={1.5} /> Meta
    </span>
  );
}

// ── Foto con lightbox ────────────────────────────────────────────────────────

function MemoryPhoto({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  const [lightbox, setLightbox] = useState(false);

  if (!url) {
    return (
      <div className="w-full h-[240px] rounded-[16px] flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        <span className="text-[11px] text-[var(--color-muted)]">Cargando…</span>
      </div>
    );
  }

  if (isVideoPath(path)) {
    return (
      <div className="w-full rounded-[16px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <video controls src={url} className="w-full" style={{ maxHeight: 360 }} />
      </div>
    );
  }

  return (
    <>
      <div
        className="relative w-full h-[260px] rounded-[16px] overflow-hidden cursor-pointer"
        style={{ background: "var(--color-surface)" }}
        onClick={() => setLightbox(true)}
      >
        <Image src={url} alt="Recuerdo" fill className="object-cover" unoptimized />
        <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
          <Maximize2 size={14} strokeWidth={1.5} style={{ color: "#fff" }} />
        </div>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.93)" }} onClick={() => setLightbox(false)}>
          <button onClick={(e) => { e.stopPropagation(); setLightbox(false); }} className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center z-10" style={{ background: "rgba(255,255,255,0.12)" }}>
            <X size={18} strokeWidth={1.5} style={{ color: "#fff" }} />
          </button>
          <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image src={url} alt="Recuerdo ampliado" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
    </>
  );
}

function AfterPhoto({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) return <div className="w-full h-[180px] rounded-[12px] flex items-center justify-center" style={{ background: "var(--color-surface)" }}><span className="text-[11px] text-[var(--color-muted)]">Cargando…</span></div>;
  return (
    <div className="relative w-full h-[220px] rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
      <Image src={url} alt="Después" fill className="object-cover" unoptimized />
    </div>
  );
}

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-[12px] px-3.5 py-3" style={{ background: "var(--color-surface)" }}>
      <p className="text-[11px] text-[var(--color-muted)] mb-1.5 flex items-center gap-1.5">
        <span className="text-[var(--color-muted)]">{icon}</span> {label}
      </p>
      {children}
    </div>
  );
}

// ── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({ memory, onRemoveRequest }: { memory: Memory; onRemoveRequest: (m: Memory) => void }) {
  const [open, setOpen] = useState(false);
  const ev = memory.evidence;
  const subtitle = [formatDate(memory.check_date), memory.goal_title].filter(Boolean).join(" · ");

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[18px] overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3.5 text-left">
        <MemoryThumb path={memory.path} />
        <div className="flex-1 min-w-0">
          <div className="mb-1"><KindBadge kind={memory.kind} /></div>
          <p className="text-[12px] text-[var(--color-muted)] truncate capitalize">{subtitle}</p>
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.5}
          className="text-[var(--color-muted)] transition-transform flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <MemoryPhoto path={memory.path} enabled={open} />

          {ev?.after_path && (
            <div>
              <p className="text-[11px] text-[var(--color-muted)] mb-1.5">Después</p>
              <AfterPhoto path={ev.after_path} enabled={open} />
            </div>
          )}

          {ev?.timer_seconds != null && (
            <Row icon={<Timer size={13} strokeWidth={1.5} />} label="Tiempo">
              <p className="text-[13px]">{Math.floor(ev.timer_seconds / 60)} min {ev.timer_seconds % 60}s</p>
            </Row>
          )}

          {ev?.audio_path && (
            <Row icon={<Mic size={13} strokeWidth={1.5} />} label="Audio">
              <AudioFromPath path={ev.audio_path} enabled={open} />
            </Row>
          )}

          {ev?.video_path && (
            <Row icon={<VideoIcon size={13} strokeWidth={1.5} />} label="Video">
              <VideoFromPath path={ev.video_path} enabled={open} />
            </Row>
          )}

          {ev?.summary && (
            <Row icon={<AlignLeft size={13} strokeWidth={1.5} />} label="Resumen">
              <div className="max-h-[220px] overflow-y-auto">
                <p className="text-[13px]" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{ev.summary}</p>
              </div>
            </Row>
          )}

          {/* Quitar de recuerdos */}
          <button
            onClick={() => onRemoveRequest(memory)}
            className="w-full flex items-center justify-center gap-2 rounded-full py-3 text-[13px] text-red-400"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
          >
            <Trash2 size={15} strokeWidth={1.5} />
            Quitar de recuerdos
          </button>
        </div>
      )}
    </div>
  );
}

function MemoryThumb({ path }: { path: string }) {
  const url = useSignedUrl(path, true);
  if (!url) {
    return (
      <div className="w-[60px] h-[60px] flex-shrink-0 rounded-[12px] flex items-center justify-center" style={{ background: "var(--color-surface)" }}>
        <ImageIcon size={18} strokeWidth={1} className="text-[var(--color-muted)]" />
      </div>
    );
  }
  if (isVideoPath(path)) {
    return (
      <div className="relative w-[60px] h-[60px] flex-shrink-0 rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
        <video src={url} className="w-full h-full object-cover" muted playsInline />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-black/45 flex items-center justify-center"><VideoIcon size={12} strokeWidth={1.5} className="text-white" /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative w-[60px] h-[60px] flex-shrink-0 rounded-[12px] overflow-hidden" style={{ background: "var(--color-surface)" }}>
      <Image src={url} alt="Recuerdo" fill className="object-cover" unoptimized />
    </div>
  );
}

function AudioFromPath({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) return <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>;
  return <AudioPlayer url={url} />;
}

function VideoFromPath({ path, enabled }: { path: string; enabled: boolean }) {
  const url = useSignedUrl(path, enabled);
  if (!url) return <p className="text-[12px] text-[var(--color-muted)]">Cargando…</p>;
  return <video controls src={url} className="w-full rounded-[10px]" style={{ maxHeight: 280 }} />;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RecuerdosPage() {
  const router = useRouter();
  const { data: memories = [], isLoading } = useMemoriesList();
  const removeMemory = useRemoveMemoryById();
  const [confirm, setConfirm] = useState<Memory | null>(null);

  function handleConfirmRemove() {
    if (!confirm) return;
    removeMemory.mutate(confirm.id, { onSettled: () => setConfirm(null) });
  }

  // Agrupar por año (desc)
  const byYear = new Map<number, Memory[]>();
  for (const m of memories) {
    const arr = byYear.get(m.year) ?? [];
    arr.push(m);
    byYear.set(m.year, arr);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="px-4 pt-2 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center text-[var(--color-muted)]">
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h1 className="font-display font-semibold text-[19px]">Recuerdos</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-[88px] bg-[var(--color-bg-card)] rounded-[18px] animate-pulse" />)}
        </div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center">
            <Bookmark size={24} strokeWidth={1} className="text-[var(--color-muted)]" />
          </div>
          <p className="text-[15px] font-medium">Aún no tienes recuerdos</p>
          <p className="text-[13px] text-[var(--color-muted)] max-w-[260px]">
            Guarda tus evidencias favoritas desde el detalle de un check para conservarlas todo el año.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <section key={year}>
              <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider font-medium mb-3">{year}</p>
              <div className="space-y-3">
                {byYear.get(year)!.map((m) => <MemoryCard key={m.id} memory={m} onRemoveRequest={setConfirm} />)}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {confirm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center px-6" style={{ background: "var(--color-overlay)" }} onClick={() => !removeMemory.isPending && setConfirm(null)}>
          <div className="w-full max-w-[340px] rounded-[20px] p-5" style={{ background: "var(--color-bg-card)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(239,68,68,0.1)" }}>
              <Trash2 size={20} strokeWidth={1.5} className="text-red-400" />
            </div>
            <p className="font-display font-medium text-[17px] text-center mb-1.5">Quitar de recuerdos</p>
            <p className="text-[13px] text-[var(--color-muted)] text-center mb-5">
              Se quitará de tus recuerdos y del Wrapped anual. Ya no podrás ver esta foto, audio ni resumen. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirm(null)}
                disabled={removeMemory.isPending}
                className="flex-1 text-[14px] rounded-full py-3 disabled:opacity-50"
                style={{ border: "1px solid var(--color-border)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={removeMemory.isPending}
                className="flex-1 text-[14px] font-medium text-red-400 rounded-full py-3 disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                {removeMemory.isPending ? "Quitando…" : "Quitar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
