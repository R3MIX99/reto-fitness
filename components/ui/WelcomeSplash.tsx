"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useMyGroups, useTodayScore } from "@/lib/hooks/useGroups";

const QUOTES = [
  "Tú puedes. Un día más de constancia te acerca a la cima.",
  "La disciplina pesa kilos; el arrepentimiento pesa toneladas.",
  "Hoy es un buen día para ser el más fuerte.",
  "Tu único rival de ayer eres tú mismo.",
  "Pequeños hábitos, grandes campeones.",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function randomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

const MAX_POINTS = 13;

export function WelcomeSplash() {
  const { displayName } = useProfile();
  // Puntos reales de hoy del grupo principal (mismo origen que el dashboard)
  const { data: groups = [] } = useMyGroups();
  const { data: pointsToday = 0 } = useTodayScore(groups[0]?.id ?? null);
  const maxPoints = MAX_POINTS;
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  const splashKey = `splash_shown_${new Date().toISOString().split("T")[0]}`;

  useEffect(() => {
    if (localStorage.getItem(splashKey)) {
      setVisible(false);
    }
    setMounted(true);
  }, [splashKey]);
  const [fading, setFading] = useState(false);
  const [quote] = useState(randomQuote);
  const greeting = getGreeting();
  const firstName = displayName.split(" ")[0];

  useEffect(() => {
    if (!visible) return;
    localStorage.setItem(splashKey, "1");
    const fadeTimer = setTimeout(() => setFading(true), 2800);
    const hideTimer = setTimeout(() => setVisible(false), 3300);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [visible, splashKey]);

  if (!mounted || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8 text-center backdrop-blur-md"
      style={{
        background: "rgba(0,0,0,0.75)",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
      onClick={() => { setFading(true); setTimeout(() => setVisible(false), 500); }}
    >
      {/* Greeting */}
      <p className="text-[var(--color-muted)] text-[15px] mb-1">{greeting},</p>
      <h1 className="font-display font-semibold text-[38px] leading-tight text-[var(--color-fg)] mb-6">
        {firstName}<span className="text-warm">.</span>
      </h1>

      {/* Points today */}
      <div className="mb-8 flex flex-col items-center">
        <span className="font-display font-semibold text-[56px] leading-none text-[var(--color-fg)]">
          {pointsToday}
          <span className="text-[24px] text-[var(--color-muted)] font-medium">/{maxPoints}</span>
        </span>
        <span className="text-[13px] text-[var(--color-muted)] mt-1">puntos hoy</span>
      </div>

      {/* Quote */}
      <p className="text-[14px] text-[var(--color-muted)] max-w-[280px] leading-relaxed italic">
        &ldquo;{quote}&rdquo;
      </p>

      <p className="mt-10 text-[11px] text-[var(--color-muted)]/50">Toca para continuar</p>
    </div>
  );
}
