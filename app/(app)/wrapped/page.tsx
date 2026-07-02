"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X, Dumbbell, UtensilsCrossed, Target, Flame, Trophy, Calendar, Zap, Sparkles, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWrapped } from "@/lib/hooks/useWrapped";
import { useMemoriesList } from "@/lib/hooks/useMemories";

const MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
const YEAR = new Date().getFullYear();

// Frase dinámica según el bloque de días de racha (días seguidos completando
// TODO: gimnasio + dieta + metas del día).
function streakPhrase(days: number): string {
  if (days <= 4) return "¡Cada racha empieza con un primer día!";
  if (days <= 10) return "Te mantuviste constante. ¡Ese es el hábito!";
  if (days <= 20) return "Estás en llamas — la disciplina ya es tuya.";
  if (days <= 40) return "Imparable. Muy pocos llegan tan lejos.";
  return "Leyenda de la constancia. Nivel élite.";
}

function SignedImg({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    createClient().storage.from("evidencias").createSignedUrl(path, 3600)
      .then(({ data }) => { if (!cancelled && data?.signedUrl) setUrl(data.signedUrl); });
    return () => { cancelled = true; };
  }, [path]);
  return (
    <div className="relative w-full aspect-square rounded-[12px] overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      {url && <Image src={url} alt="" fill className="object-cover" unoptimized />}
    </div>
  );
}

interface Slide {
  bg: string;
  content: ReactNode;
}

export default function WrappedPage() {
  const router = useRouter();
  const { data, isLoading } = useWrapped(YEAR);
  const { data: memories = [] } = useMemoriesList();
  const [i, setI] = useState(0);

  const close = () => router.push("/dashboard");

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: "#0a0a0f" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "var(--color-warm)" }} />
      </div>
    );
  }

  const d = data;
  const noActivity = !d || d.active_days === 0;

  if (noActivity) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8 text-center gap-3" style={{ background: "#0a0a0f", color: "#fff" }}>
        <Sparkles size={32} strokeWidth={1.5} style={{ color: "var(--color-warm)" }} />
        <p className="font-display font-semibold text-[20px]">Tu Wrapped {YEAR} está en camino</p>
        <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          Registra tus entrenamientos y metas durante el año para construir tu resumen.
        </p>
        <button onClick={close} className="mt-3 rounded-full px-5 py-2.5 text-[13px] font-medium" style={{ background: "var(--color-warm)", color: "#1a1000" }}>
          Volver
        </button>
      </div>
    );
  }

  const yearMemories = memories.filter((m) => m.year === YEAR).slice(0, 6);

  // ── Slides (solo los que aplican) ──────────────────────────────────────────
  const slides: Slide[] = [];

  slides.push({
    bg: "linear-gradient(160deg,#CF5C36,#7a2d15)",
    content: (
      <>
        <Sparkles size={40} strokeWidth={1.5} className="mb-4" style={{ color: "#fff" }} />
        <p className="text-[15px] mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>Tu año en Olympo</p>
        <p className="font-display font-bold text-[64px] leading-none">{YEAR}</p>
        <p className="text-[14px] mt-4" style={{ color: "rgba(255,255,255,0.8)" }}>Toca para ver tu resumen →</p>
      </>
    ),
  });

  slides.push({
    bg: "linear-gradient(160deg,#1e3a5f,#0a1828)",
    content: (
      <>
        <Calendar size={32} strokeWidth={1.5} className="mb-3" style={{ color: "var(--color-warm)" }} />
        <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>Te presentaste</p>
        <p className="font-display font-bold text-[80px] leading-none" style={{ color: "var(--color-warm)" }}>{d.active_days}</p>
        <p className="text-[18px] mt-2">{d.active_days === 1 ? "día" : "días"} este año</p>
      </>
    ),
  });

  slides.push({
    bg: "linear-gradient(160deg,#3a1f5f,#160a28)",
    content: (
      <>
        <Zap size={32} strokeWidth={1.5} className="mb-3" style={{ color: "#C9A8FF" }} />
        <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>Subiste</p>
        <p className="font-display font-bold text-[80px] leading-none" style={{ color: "#C9A8FF" }}>{d.total_checks}</p>
        <p className="text-[18px] mt-2 mb-6">evidencias</p>
        <div className="flex gap-5 text-[13px]" style={{ color: "rgba(255,255,255,0.85)" }}>
          <span className="flex items-center gap-1.5"><Dumbbell size={15} strokeWidth={1.5} /> {d.gym_checks}</span>
          <span className="flex items-center gap-1.5"><UtensilsCrossed size={15} strokeWidth={1.5} /> {d.diet_checks}</span>
          <span className="flex items-center gap-1.5"><Target size={15} strokeWidth={1.5} /> {d.goal_checks}</span>
        </div>
      </>
    ),
  });

  slides.push({
    bg: "linear-gradient(160deg,#CF5C36,#3a1205)",
    content: (
      <>
        <Flame size={40} strokeWidth={1.5} className="mb-3" fill="#fff" style={{ color: "#fff" }} />
        <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>Tu mejor racha</p>
        <p className="font-display font-bold text-[80px] leading-none">{d.longest_streak}</p>
        <p className="text-[18px] mt-2 mb-5">
          {d.longest_streak === 0
            ? "días seguidos completando todo"
            : d.longest_streak === 1
            ? "día completando todo"
            : "días seguidos completando todo"}
        </p>
        <p className="text-[14px] max-w-[260px]" style={{ color: "rgba(255,255,255,0.85)" }}>{streakPhrase(d.longest_streak)}</p>
      </>
    ),
  });

  if (d.best_month) {
    slides.push({
      bg: "linear-gradient(160deg,#0f5132,#06291a)",
      content: (
        <>
          <Calendar size={32} strokeWidth={1.5} className="mb-3" style={{ color: "#5fe3a1" }} />
          <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>Tu mes más fuerte</p>
          <p className="font-display font-bold text-[48px] leading-tight capitalize" style={{ color: "#5fe3a1" }}>{MESES[d.best_month - 1]}</p>
          <p className="text-[16px] mt-2">{d.best_month_days} {d.best_month_days === 1 ? "evidencia subida" : "evidencias subidas"}</p>
        </>
      ),
    });
  }

  slides.push({
    bg: "linear-gradient(160deg,#5f4a1f,#281d06)",
    content: (
      <>
        <Zap size={32} strokeWidth={1.5} className="mb-3" style={{ color: "var(--color-warm)" }} />
        <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.8)" }}>Sumaste</p>
        <p className="font-display font-bold text-[72px] leading-none" style={{ color: "var(--color-warm)" }}>{d.total_points.toLocaleString("es-MX")}</p>
        <p className="text-[18px] mt-2">puntos en total</p>
      </>
    ),
  });

  if (d.titles > 0) {
    slides.push({
      bg: "linear-gradient(160deg,#7a5a00,#2a1d00)",
      content: (
        <>
          <Trophy size={40} strokeWidth={1.5} className="mb-3" style={{ color: "var(--color-warm)" }} />
          <p className="text-[15px] mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>Te coronaste</p>
          <p className="font-display font-bold text-[80px] leading-none" style={{ color: "var(--color-warm)" }}>{d.titles}</p>
          <p className="text-[18px] mt-2">{d.titles === 1 ? "vez campeón" : "veces campeón"}</p>
        </>
      ),
    });
  }

  if (yearMemories.length > 0) {
    slides.push({
      bg: "linear-gradient(160deg,#2a2a35,#0e0e14)",
      content: (
        <>
          <Bookmark size={30} strokeWidth={1.5} className="mb-3" style={{ color: "var(--color-warm)" }} />
          <p className="text-[15px] mb-4" style={{ color: "rgba(255,255,255,0.85)" }}>Tus recuerdos del año</p>
          <div className="grid grid-cols-3 gap-2 w-full max-w-[300px]">
            {yearMemories.map((m) => <SignedImg key={m.id} path={m.path} />)}
          </div>
        </>
      ),
    });
  }

  slides.push({
    bg: "linear-gradient(160deg,#CF5C36,#7a2d15)",
    content: (
      <>
        <Sparkles size={40} strokeWidth={1.5} className="mb-4" style={{ color: "#fff" }} />
        <p className="font-display font-bold text-[30px] leading-tight mb-2">¡Gran año!</p>
        <p className="text-[15px] mb-8" style={{ color: "rgba(255,255,255,0.85)", maxWidth: 280 }}>
          Sigue así en {YEAR + 1}. El más constante gana.
        </p>
        <button onClick={close} className="relative z-[5] rounded-full px-6 py-3 text-[14px] font-semibold" style={{ background: "#fff", color: "#7a2d15" }}>
          Terminar
        </button>
      </>
    ),
  });

  const total = slides.length;
  const cur = Math.min(i, total - 1);

  function next() { setI((v) => (v < total - 1 ? v + 1 : v)); }
  function prev() { setI((v) => (v > 0 ? v - 1 : v)); }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: slides[cur].bg, color: "#fff", transition: "background 0.4s ease" }}>
      {/* Progress bars */}
      <div className="flex gap-1.5 px-3 pt-3 flex-shrink-0">
        {slides.map((_, idx) => (
          <div key={idx} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.25)" }}>
            <div className="h-full rounded-full" style={{ background: "#fff", width: idx <= cur ? "100%" : "0%", transition: "width 0.3s ease" }} />
          </div>
        ))}
      </div>

      {/* Close */}
      <div className="flex justify-end px-3 pt-2 flex-shrink-0 relative z-[5]">
        <button onClick={close} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
          <X size={18} strokeWidth={1.5} style={{ color: "#fff" }} />
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-8 select-none">
        {slides[cur].content}
      </div>

      {/* Tap zones (debajo de los botones interactivos) */}
      <button aria-label="Anterior" onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3 z-[2]" style={{ background: "transparent" }} />
      <button aria-label="Siguiente" onClick={next} className="absolute right-0 top-0 bottom-0 w-2/3 z-[2]" style={{ background: "transparent" }} />
    </div>
  );
}
