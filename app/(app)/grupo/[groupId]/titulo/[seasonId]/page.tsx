"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Crown, Users, User, Check } from "lucide-react";
import { TitleBadge, TitleStylePicker, type TitleStyleId } from "@/components/player/TitleBadge";
import { useSeasonCustomTitle, useSetSeasonCustomTitle, type GenderMode } from "@/lib/hooks/useCustomTitle";

const PLACEHOLDER_DEFAULT = "El campeón";
const PLACEHOLDER_MALE    = "El Rey";
const PLACEHOLDER_FEMALE  = "La Reina";

export default function TituloPage() {
  const router   = useRouter();
  const params   = useParams();
  const groupId  = params.groupId  as string;
  const seasonId = params.seasonId as string;

  const { data: existing }  = useSeasonCustomTitle(seasonId);
  const setCustomTitle       = useSetSeasonCustomTitle();

  const [genderMode,      setGenderMode]      = useState<GenderMode>("default");
  const [titleText,       setTitleText]       = useState("");
  const [titleTextMale,   setTitleTextMale]   = useState("");
  const [titleTextFemale, setTitleTextFemale] = useState("");
  const [titleStyle,      setTitleStyle]      = useState<TitleStyleId>("shadow");
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Carga del título existente
  useEffect(() => {
    if (!existing) return;
    setGenderMode(existing.gender_mode ?? "default");
    setTitleText(existing.title_text ?? "");
    setTitleTextMale(existing.title_text_male ?? "");
    setTitleTextFemale(existing.title_text_female ?? "");
    setTitleStyle(existing.title_style);
  }, [existing]);

  // Textos para el preview
  const previewMain   = genderMode === "default"
    ? (titleText.trim() || PLACEHOLDER_DEFAULT)
    : (titleTextMale.trim() || PLACEHOLDER_MALE);
  const previewFemale = titleTextFemale.trim() || PLACEHOLDER_FEMALE;

  const canSave = genderMode === "default"
    ? titleText.trim().length >= 3
    : titleTextMale.trim().length >= 3 && titleTextFemale.trim().length >= 3;

  async function handleSave() {
    setError(null);
    try {
      await setCustomTitle.mutateAsync({
        seasonId,
        genderMode,
        titleText:       genderMode === "default"  ? titleText.trim()       : null,
        titleTextMale:   genderMode === "gendered" ? titleTextMale.trim()   : null,
        titleTextFemale: genderMode === "gendered" ? titleTextFemale.trim() : null,
        titleStyle,
      });
      setSaved(true);
      setTimeout(() => router.push("/grupo"), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <button
          onClick={() => router.push("/grupo")}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-surface)" }}
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div className="flex items-center gap-2">
          <Crown size={15} strokeWidth={1.5} className="text-warm" />
          <h1 className="font-display font-semibold text-[17px]">Título del campeón</h1>
        </div>
        <span
          className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: "rgba(239,200,139,0.15)", color: "var(--color-warm)" }}
        >
          Elite
        </span>
      </div>

      {/* ── Contenido con scroll ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-36">

        {/* Preview grande */}
        <div className="flex flex-col items-center py-10 gap-2">
          <p className="text-[11px] uppercase tracking-widest text-[var(--color-muted)] mb-4">
            Vista previa
          </p>

          {genderMode === "default" ? (
            <div style={{ transform: "scale(1.9)", transformOrigin: "center", margin: "0 0 28px" }}>
              <TitleBadge text={previewMain} styleId={titleStyle} size="lg" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <div style={{ transform: "scale(1.9)", transformOrigin: "center", marginBottom: "12px" }}>
                  <TitleBadge text={previewMain} styleId={titleStyle} size="lg" />
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">Para hombres</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div style={{ transform: "scale(1.9)", transformOrigin: "center", marginBottom: "12px" }}>
                  <TitleBadge text={previewFemale} styleId={titleStyle} size="lg" />
                </div>
                <span className="text-[11px] text-[var(--color-muted)]">Para mujeres</span>
              </div>
            </div>
          )}
        </div>

        {/* Modo de género */}
        <div className="mb-6">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-widest mb-3">Modo</p>
          <div className="flex gap-2">
            <button
              onClick={() => setGenderMode("default")}
              className="flex-1 flex items-center gap-2 rounded-[12px] px-3 py-3.5"
              style={{
                border: `1.5px solid ${genderMode === "default" ? "var(--color-warm)" : "var(--color-border)"}`,
                background: genderMode === "default" ? "rgba(239,200,139,0.07)" : "var(--color-surface)",
              }}
            >
              <Users
                size={15}
                strokeWidth={1.5}
                style={{ color: genderMode === "default" ? "var(--color-warm)" : "var(--color-muted)" }}
              />
              <span className="text-[13px] font-medium">Para todos</span>
              {genderMode === "default" && (
                <span className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--color-warm)" }}>
                  <Check size={10} strokeWidth={3} style={{ color: "#1a0f00" }} />
                </span>
              )}
            </button>
            <button
              onClick={() => setGenderMode("gendered")}
              className="flex-1 flex items-center gap-2 rounded-[12px] px-3 py-3.5"
              style={{
                border: `1.5px solid ${genderMode === "gendered" ? "var(--color-warm)" : "var(--color-border)"}`,
                background: genderMode === "gendered" ? "rgba(239,200,139,0.07)" : "var(--color-surface)",
              }}
            >
              <User
                size={15}
                strokeWidth={1.5}
                style={{ color: genderMode === "gendered" ? "var(--color-warm)" : "var(--color-muted)" }}
              />
              <span className="text-[13px] font-medium">Por género</span>
              {genderMode === "gendered" && (
                <span className="ml-auto w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--color-warm)" }}>
                  <Check size={10} strokeWidth={3} style={{ color: "#1a0f00" }} />
                </span>
              )}
            </button>
          </div>
          <p className="text-[11px] text-[var(--color-muted)] mt-2">
            {genderMode === "default"
              ? "El mismo título para todos los jugadores."
              : "Un título distinto según el género del jugador."}
          </p>
        </div>

        {/* Inputs de texto */}
        {genderMode === "default" ? (
          <div className="mb-6">
            <label className="text-[11px] text-[var(--color-muted)] uppercase tracking-widest mb-2 block">
              Texto del título
            </label>
            <input
              type="text"
              placeholder="Ej: El Imbatible, La Leyenda…"
              value={titleText}
              onChange={(e) => setTitleText(e.target.value.slice(0, 40))}
              maxLength={40}
              autoComplete="off"
              className="w-full bg-[var(--color-surface)] rounded-[12px] px-4 py-3.5 text-[15px] text-[var(--color-fg)] outline-none border"
              style={{ borderColor: "var(--color-border)" }}
            />
            <p className="text-[11px] text-[var(--color-muted)] mt-1.5">
              {titleText.length}/40 · mínimo 3 caracteres
            </p>
          </div>
        ) : (
          <div className="mb-6 flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[var(--color-muted)] uppercase tracking-widest mb-2 block">
                Para hombres
              </label>
              <input
                type="text"
                placeholder="Ej: El Rey, El Campeón…"
                value={titleTextMale}
                onChange={(e) => setTitleTextMale(e.target.value.slice(0, 40))}
                maxLength={40}
                autoComplete="off"
                className="w-full bg-[var(--color-surface)] rounded-[12px] px-4 py-3.5 text-[15px] text-[var(--color-fg)] outline-none border"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            <div>
              <label className="text-[11px] text-[var(--color-muted)] uppercase tracking-widest mb-2 block">
                Para mujeres
              </label>
              <input
                type="text"
                placeholder="Ej: La Reina, La Campeona…"
                value={titleTextFemale}
                onChange={(e) => setTitleTextFemale(e.target.value.slice(0, 40))}
                maxLength={40}
                autoComplete="off"
                className="w-full bg-[var(--color-surface)] rounded-[12px] px-4 py-3.5 text-[15px] text-[var(--color-fg)] outline-none border"
                style={{ borderColor: "var(--color-border)" }}
              />
            </div>
            {(!canSave && (titleTextMale.length > 0 || titleTextFemale.length > 0)) && (
              <p className="text-[11px] text-[var(--color-muted)]">Ambos textos deben tener al menos 3 caracteres.</p>
            )}
          </div>
        )}

        {/* Selector de estilo */}
        <div className="mb-6">
          <p className="text-[11px] text-[var(--color-muted)] uppercase tracking-widest mb-3">
            Estilo del badge
          </p>
          <TitleStylePicker
            value={titleStyle}
            onChange={setTitleStyle}
            previewText={previewMain}
          />
        </div>

        {error && (
          <p className="text-[13px] text-red-400 mb-4">{error}</p>
        )}
      </div>

      {/* ── Botón guardar (fijo abajo) ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3"
        style={{ background: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}
      >
        {saved ? (
          <div
            className="w-full rounded-pill py-3.5 text-center text-[15px] font-semibold flex items-center justify-center gap-2"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
          >
            <Check size={16} strokeWidth={2.5} />
            Título guardado
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={!canSave || setCustomTitle.isPending}
            className="w-full bg-accent text-white rounded-pill py-3.5 text-[15px] font-semibold disabled:opacity-40 transition-opacity"
          >
            {setCustomTitle.isPending ? "Guardando…" : "Guardar título"}
          </button>
        )}
      </div>
    </div>
  );
}
