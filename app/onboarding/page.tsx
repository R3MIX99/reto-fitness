"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy, ChevronRight, ChevronLeft, Check, Dumbbell, UtensilsCrossed,
  Target, Camera, Users, Plus,
} from "lucide-react";
import { useProfile } from "@/lib/hooks/useProfile";
import { useUpsertGoal } from "@/lib/hooks/useChecklist";

const MEAL_SUGGESTIONS = ["Desayuno", "Comida", "Cena", "Snack"];
const GOAL_SUGGESTIONS = ["Dormir 8 h", "Tomar agua", "Leer 20 min", "Meditar", "10 mil pasos", "Sin azúcar"];

type Gender = "male" | "female" | "unspecified";

// ── Selector de chips con opción de agregar propios ───────────────────────────
function ChipPicker({
  suggestions,
  items,
  setItems,
  placeholder,
  accent,
}: {
  suggestions: string[];
  items: string[];
  setItems: (v: string[]) => void;
  placeholder: string;
  accent: string;
}) {
  const [custom, setCustom] = useState("");

  function toggle(s: string) {
    setItems(items.includes(s) ? items.filter((x) => x !== s) : [...items, s]);
  }
  function addCustom() {
    const v = custom.trim();
    if (v && !items.includes(v)) setItems([...items, v]);
    setCustom("");
  }

  const extras = items.filter((i) => !suggestions.includes(i));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestions.map((s) => {
          const on = items.includes(s);
          return (
            <button
              key={s}
              onClick={() => toggle(s)}
              className="text-[13px] rounded-full px-3.5 py-2 transition-colors border"
              style={{
                background: on ? accent : "var(--color-surface)",
                color: on ? "#1a0f08" : "var(--color-fg)",
                borderColor: on ? accent : "var(--color-border)",
              }}
            >
              {on && <Check size={12} strokeWidth={2.5} className="inline mr-1 -mt-0.5" />}
              {s}
            </button>
          );
        })}
        {extras.map((s) => (
          <button
            key={s}
            onClick={() => toggle(s)}
            className="text-[13px] rounded-full px-3.5 py-2 border"
            style={{ background: accent, color: "#1a0f08", borderColor: accent }}
          >
            <Check size={12} strokeWidth={2.5} className="inline mr-1 -mt-0.5" />
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder={placeholder}
          className="flex-1 bg-[var(--color-surface)] rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none border"
          style={{ borderColor: "var(--color-border)" }}
        />
        <button
          onClick={addCustom}
          className="w-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <Plus size={18} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        </button>
      </div>
    </div>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { displayName, completeOnboarding } = useProfile();
  const upsertGoal = useUpsertGoal();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("unspecified");
  const [meals, setMeals] = useState<string[]>(["Desayuno", "Comida", "Cena"]);
  const [goals, setGoals] = useState<string[]>(["Dormir 8 h", "Tomar agua"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill del nombre con el de Google la primera vez
  const effectiveName = name || displayName;

  const TOTAL = 7;

  function next() { setStep((s) => Math.min(TOTAL - 1, s + 1)); }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      for (const t of meals) await upsertGoal.mutateAsync({ kind: "diet", title: t });
      for (const t of goals) await upsertGoal.mutateAsync({ kind: "goal", title: t });
      await completeOnboarding({ full_name: effectiveName.trim() || "Jugador", gender });
      // Vuelve al destino pendiente (p. ej. invitación) o al dashboard
      const nextParam = searchParams.get("next");
      const dest = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
      router.push(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col px-6 pt-8 pb-8">
      {/* Progreso */}
      <div className="flex gap-1.5 mb-8">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors"
            style={{ background: i <= step ? "var(--color-warm)" : "var(--color-border)" }}
          />
        ))}
      </div>

      <div className="flex-1">
        {/* 0 — Bienvenida */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-20 h-20 rounded-[24px] bg-accent flex items-center justify-center mb-6">
              <Trophy size={34} strokeWidth={1.5} className="text-white" />
            </div>
            <h1 className="font-display font-semibold text-[28px] mb-3">Bienvenido a Olympo</h1>
            <p className="text-[14px] text-[var(--color-muted)] max-w-[300px] leading-relaxed">
              Compite con tus amigos por temporadas cumpliendo tus hábitos: gimnasio, dieta y metas diarias. Cada día suma puntos. El más constante gana.
            </p>
          </div>
        )}

        {/* 1 — Nombre */}
        {step === 1 && (
          <div>
            <h2 className="font-display font-semibold text-[22px] mb-2">¿Cómo quieres que te conozcan?</h2>
            <p className="text-[13px] text-[var(--color-muted)] mb-6">
              Este es el nombre que verán tus amigos en el ranking, las notificaciones y los títulos.
            </p>
            <input
              autoFocus
              value={effectiveName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-[var(--color-surface)] rounded-[14px] px-4 py-3.5 text-[16px] outline-none border"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
        )}

        {/* 2 — Género */}
        {step === 2 && (
          <div>
            <h2 className="font-display font-semibold text-[22px] mb-2">¿Cuál es tu género?</h2>
            <p className="text-[13px] text-[var(--color-muted)] mb-6">
              Lo usamos para personalizar tus títulos (campeón / campeona).
            </p>
            <div className="flex flex-col gap-2.5">
              {([["male","Hombre"],["female","Mujer"],["unspecified","Prefiero no decir"]] as [Gender,string][]).map(([g, label]) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className="w-full flex items-center justify-between rounded-[14px] px-4 py-3.5 text-[15px] border"
                  style={{
                    background: gender === g ? "rgba(239,200,139,0.12)" : "var(--color-surface)",
                    borderColor: gender === g ? "var(--color-warm)" : "var(--color-border)",
                  }}
                >
                  {label}
                  {gender === g && <Check size={17} strokeWidth={2} className="text-warm" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3 — Gimnasio */}
        {step === 3 && (
          <div>
            <div className="w-14 h-14 rounded-[18px] bg-accent/15 flex items-center justify-center mb-5">
              <Dumbbell size={26} strokeWidth={1.5} className="text-accent" />
            </div>
            <h2 className="font-display font-semibold text-[22px] mb-2">El gimnasio cuenta a diario</h2>
            <p className="text-[14px] text-[var(--color-muted)] leading-relaxed">
              Cada día puedes registrar tu ejercicio con una foto: vale desde una caminata ligera hasta un entrenamiento completo. Es 1 registro por día y suma a tu puntaje.
            </p>
          </div>
        )}

        {/* 4 — Comidas */}
        {step === 4 && (
          <div>
            <div className="w-14 h-14 rounded-[18px] bg-warm/15 flex items-center justify-center mb-5">
              <UtensilsCrossed size={26} strokeWidth={1.5} className="text-warm" />
            </div>
            <h2 className="font-display font-semibold text-[22px] mb-2">Tus comidas del día</h2>
            <p className="text-[13px] text-[var(--color-muted)] mb-5">
              Elige las comidas que quieres registrar cada día. Podrás cambiarlas después.
            </p>
            <ChipPicker suggestions={MEAL_SUGGESTIONS} items={meals} setItems={setMeals} placeholder="Otra comida…" accent="#EFC88B" />
          </div>
        )}

        {/* 5 — Metas */}
        {step === 5 && (
          <div>
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-5" style={{ background: "var(--color-surface)" }}>
              <Target size={26} strokeWidth={1.5} className="text-[var(--color-fg)]" />
            </div>
            <h2 className="font-display font-semibold text-[22px] mb-2">Tus metas diarias</h2>
            <p className="text-[13px] text-[var(--color-muted)] mb-5">
              Hábitos que quieres cumplir cada día. Elige algunos o agrega los tuyos.
            </p>
            <ChipPicker suggestions={GOAL_SUGGESTIONS} items={goals} setItems={setGoals} placeholder="Otra meta…" accent="#EFC88B" />
          </div>
        )}

        {/* 6 — Cómo se gana */}
        {step === 6 && (
          <div>
            <h2 className="font-display font-semibold text-[22px] mb-5">Cómo funciona</h2>
            <div className="flex flex-col gap-3">
              {[
                { icon: <Camera size={18} strokeWidth={1.5} className="text-accent" />, t: "Sube evidencia", d: "Cada check necesita una foto para contar." },
                { icon: <Trophy size={18} strokeWidth={1.5} className="text-warm" />, t: "Suma puntos", d: "Gimnasio, comidas y metas suman puntos cada día." },
                { icon: <Users size={18} strokeWidth={1.5} className="text-warm" />, t: "Auditoría entre amigos", d: "Cada semana validan la evidencia de los demás." },
                { icon: <Trophy size={18} strokeWidth={1.5} className="text-accent" />, t: "Temporadas", d: "Compiten por periodos; gana el más constante." },
              ].map((x, i) => (
                <div key={i} className="flex items-start gap-3 rounded-[14px] p-3.5" style={{ background: "var(--color-surface)" }}>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-bg-card)] flex items-center justify-center flex-shrink-0">{x.icon}</div>
                  <div>
                    <p className="text-[14px] font-medium">{x.t}</p>
                    <p className="text-[12px] text-[var(--color-muted)]">{x.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[12px] text-red-400 mt-3">{error}</p>}

      {/* Navegación */}
      <div className="flex items-center gap-3 mt-6">
        {step > 0 && (
          <button
            onClick={back}
            disabled={saving}
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
        )}
        {step < TOTAL - 1 ? (
          <button
            onClick={next}
            disabled={step === 1 && !effectiveName.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium disabled:opacity-40"
          >
            Continuar
            <ChevronRight size={17} strokeWidth={1.5} />
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium disabled:opacity-50"
          >
            {saving ? "Preparando tu cuenta…" : "Empezar"}
            {!saving && <Check size={17} strokeWidth={2} />}
          </button>
        )}
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingInner />
    </Suspense>
  );
}
