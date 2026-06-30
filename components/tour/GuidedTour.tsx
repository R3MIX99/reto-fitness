"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";
import { PENDING_INVITE_KEY } from "@/lib/constants";

type Step = {
  route: string;
  target: string | null; // data-tour value, o null para tooltip centrado
  title: string;
  body: string;
};

const STEPS: Step[] = [
  { route: "/dashboard", target: "dash-points", title: "Tus puntos de hoy", body: "Aquí ves los puntos que llevas hoy y tu racha. Suman gimnasio, comidas y metas diarias." },
  { route: "/dashboard", target: null, title: "Únete a un grupo", body: "Para competir necesitas un grupo. Te llevo a la pestaña de grupos." },
  { route: "/grupo", target: "group-card", title: "Tu grupo", body: "Crea un grupo o únete con un código. Desde aquí invitas a tus amigos." },
  { route: "/grupo", target: "season-banner", title: "Temporadas", body: "El dueño inicia temporadas. Verás la fase actual y cuándo termina la competencia." },
  { route: "/checklist", target: "checklist-stats", title: "Tu progreso", body: "Tu calendario y tus estadísticas de cumplimiento del mes." },
  { route: "/checklist", target: "gym-section", title: "Gimnasio diario", body: "Sube tu ejercicio cada día con una foto: vale desde una caminata ligera hasta un entrenamiento completo." },
  { route: "/checklist", target: "goals-section", title: "Comidas y metas", body: "Marca tus comidas y metas diarias. Cada check necesita una foto de evidencia para contar." },
  { route: "/checklist", target: "nav-audit", title: "Auditorías", body: "Cada semana revisas la evidencia de tus amigos para validar sus puntos. ¡Listo, ya sabes lo básico!" },
];

const PAD = 8;

export function GuidedTour() {
  const { profile, loading, completeTour } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const startedRef = useRef(false);

  // Arranca la guía una sola vez para usuarios recién onboarded
  useEffect(() => {
    if (!loading && profile && profile.onboarded && !profile.tour_completed && !startedRef.current) {
      startedRef.current = true;
      setIndex(0);
      setActive(true);
    }
  }, [loading, profile]);

  const step = active ? STEPS[index] : null;

  const measure = useCallback(() => {
    if (!step) return;
    if (!step.target) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [step]);

  // Al cambiar de paso: navega a su ruta si hace falta, luego mide (con reintentos)
  useEffect(() => {
    if (!step) return;
    if (pathname !== step.route) {
      router.push(step.route);
      return; // se re-ejecuta cuando cambie pathname
    }
    let tries = 0;
    let raf = 0;
    const tick = () => {
      const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      if (step.target && !el && tries < 40) {
        tries++;
        raf = requestAnimationFrame(tick);
        return;
      }
      measure();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, pathname, router, measure]);

  // Re-medir en scroll/resize
  useEffect(() => {
    if (!active) return;
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, measure]);

  async function finish() {
    setActive(false);
    setRect(null);
    await completeTour();

    // Si el usuario llegó a través de un enlace de invitación, llevarlo a unirse al grupo
    const pendingCode = typeof window !== "undefined"
      ? localStorage.getItem(PENDING_INVITE_KEY)
      : null;
    if (pendingCode) {
      localStorage.removeItem(PENDING_INVITE_KEY);
      router.push(`/grupo/unirse?code=${pendingCode}`);
    }
  }

  function next() {
    if (index >= STEPS.length - 1) { finish(); return; }
    setRect(null);
    setIndex((i) => i + 1);
  }

  if (!active || !step) return null;

  const isLast = index === STEPS.length - 1;

  // Posición del tooltip: debajo del target si cabe, si no arriba; centrado si no hay target
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + 180 < vh;
    tooltipStyle = {
      position: "fixed",
      left: 16,
      right: 16,
      top: below ? rect.bottom + PAD + 10 : undefined,
      bottom: below ? undefined : vh - rect.top + PAD + 10,
    };
  } else {
    tooltipStyle = { position: "fixed", left: 16, right: 16, top: "50%", transform: "translateY(-50%)" };
  }

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Spotlight o dim completo */}
      {rect ? (
        <div
          className="pointer-events-none"
          style={{
            position: "fixed",
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            borderRadius: 16,
            border: "2px solid var(--color-warm)",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)",
            transition: "all 0.25s ease",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
      )}

      {/* Tooltip */}
      <div
        style={{ ...tooltipStyle, borderColor: "var(--color-border)" }}
        className="max-w-[440px] mx-auto bg-[var(--color-bg-card)] rounded-[18px] p-4 border shadow-xl"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[var(--color-muted)]">{index + 1} / {STEPS.length}</span>
          <button onClick={finish} className="text-[11px] text-[var(--color-muted)] underline underline-offset-2">
            Saltar guía
          </button>
        </div>
        <p className="font-display font-semibold text-[16px] mb-1">{step.title}</p>
        <p className="text-[13px] text-[var(--color-muted)] leading-relaxed mb-3">{step.body}</p>
        <button
          onClick={next}
          className="w-full bg-accent text-white rounded-pill py-2.5 text-[14px] font-medium"
        >
          {isLast ? "Entendido, ¡a competir!" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
