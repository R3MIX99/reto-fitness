"use client";

import { Crown, Flame, Sparkles, Landmark, Zap, Check, type LucideIcon } from "lucide-react";

// ── Mármol Olympo: SVG elegante, venas delgadas y orgánicas ─────────────────
// Curvas cúbicas (C) para naturalidad; 3 capas por vena para efecto metálico

const MARBLE_SVG = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" preserveAspectRatio="xMidYMid slice">`,

  // ── Base: blanco puro Carrara ──────────────────────────────────────────────
  `<rect width="200" height="40" fill="#FFFFFF"/>`,

  // ── Venas grises del mármol (tenues, casi invisibles) ─────────────────────
  `<path d="M0 29 C55 24,110 33,200 27" fill="none" stroke="#C8C3BA" stroke-width="0.28" opacity="0.38"/>`,
  `<path d="M33 0 C33.4 14,33.8 28,34.2 40" fill="none" stroke="#CCCAB8" stroke-width="0.22" opacity="0.3"/>`,
  `<path d="M128 0 C126 14,124 27,127 40" fill="none" stroke="#C5C0B5" stroke-width="0.2" opacity="0.28"/>`,

  // ── Vena dorada principal — diagonal con doble curva ──────────────────────
  // sombra (da profundidad a la grieta)
  `<path d="M0 11 C38 7,72 14,98 12 C130 10,162 7,200 17" fill="none" stroke="#8A6008" stroke-width="2" opacity="0.5"/>`,
  // cuerpo dorado brillante
  `<path d="M0 11 C38 7,72 14,98 12 C130 10,162 7,200 17" fill="none" stroke="#D4A020" stroke-width="1"/>`,
  // reflejo luminoso (hilo de luz)
  `<path d="M0 10.6 C38 6.6,72 13.6,98 11.6 C130 9.6,162 6.6,200 16.6" fill="none" stroke="#FFF0A0" stroke-width="0.28" opacity="0.65"/>`,

  // ── Rama de la vena principal ─────────────────────────────────────────────
  `<path d="M98 12 C98.5 22,99 32,99.5 40" fill="none" stroke="#9A7010" stroke-width="1.4" opacity="0.6"/>`,
  `<path d="M98 12 C98.5 22,99 32,99.5 40" fill="none" stroke="#E8C030" stroke-width="0.55"/>`,
  `<path d="M98 11.7 C98.5 21.7,99 31.7,99.5 39.7" fill="none" stroke="#FFF0A0" stroke-width="0.18" opacity="0.55"/>`,

  // ── Vena secundaria derecha (casi vertical, más gruesa) ───────────────────
  `<path d="M160 0 C162 12,165 24,166 34 C166.5 38,166 40,166 40" fill="none" stroke="#8A6008" stroke-width="2.6" opacity="0.45"/>`,
  `<path d="M160 0 C162 12,165 24,166 34 C166.5 38,166 40,166 40" fill="none" stroke="#C89820" stroke-width="1.4"/>`,
  `<path d="M160 0 C162 12,165 24,166 34 C166.5 38,166 40,166 40" fill="none" stroke="#FFF5B0" stroke-width="0.35" opacity="0.6"/>`,

  // bifurcación lateral de la vena secundaria
  `<path d="M165 25 C172 28,180 28,188 26" fill="none" stroke="#B88C18" stroke-width="0.75" opacity="0.7"/>`,
  `<path d="M165 25 C172 28,180 28,188 26" fill="none" stroke="#F0D040" stroke-width="0.3" opacity="0.55"/>`,

  // ── Venas finas acento ─────────────────────────────────────────────────────
  `<path d="M0 4 C14 7,24 10,32 13" fill="none" stroke="#C09020" stroke-width="0.5" opacity="0.6"/>`,
  `<path d="M0 4 C14 7,24 10,32 13" fill="none" stroke="#F0C830" stroke-width="0.2" opacity="0.5"/>`,

  `</svg>`,
].join("");

const MARBLE_URI = `data:image/svg+xml,${encodeURIComponent(MARBLE_SVG)}`;

// ── Tipos ────────────────────────────────────────────────────────────────────

export type TitleStyleId = "gold" | "fire" | "crystal" | "shadow" | "neon";

export interface TitleStyleDef {
  id: TitleStyleId;
  label: string;
  icon: LucideIcon;
  badgeStyle: React.CSSProperties;
  textStyle: React.CSSProperties;
  borderRadius: string;
}

// ── 5 estilos ────────────────────────────────────────────────────────────────

export const TITLE_STYLES: TitleStyleDef[] = [
  {
    id: "gold",
    label: "Dorado",
    icon: Crown,
    badgeStyle: {
      background: "linear-gradient(90deg,#7B5E00,#D4A017,#FFD700,#D4A017,#7B5E00)",
      backgroundSize: "200% 100%",
      animation: "titleGoldShimmer 2.4s linear infinite",
      boxShadow: "0 0 10px rgba(255,215,0,0.4)",
    },
    textStyle: { color: "#1a0f00" },
    borderRadius: "9999px",
  },
  {
    id: "fire",
    label: "Llama",
    icon: Flame,
    badgeStyle: {
      background: "linear-gradient(90deg,#B91C1C,#EA580C,#F97316)",
      boxShadow: "0 0 12px rgba(249,115,22,0.5)",
      animation: "titleFirePulse 1.8s ease-in-out infinite",
    },
    textStyle: { color: "#fff" },
    borderRadius: "8px",
  },
  {
    id: "crystal",
    label: "Cristal",
    icon: Sparkles,
    badgeStyle: {
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(8px)",
      border: "1.5px solid transparent",
      backgroundClip: "padding-box",
      boxShadow: "0 0 0 1.5px rgba(167,139,250,0.7), inset 0 0 12px rgba(255,255,255,0.04)",
    },
    textStyle: {
      background: "linear-gradient(90deg,#a78bfa,#60a5fa,#34d399)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
    },
    borderRadius: "14px",
  },
  {
    id: "shadow",
    label: "Olympo",
    icon: Landmark,
    badgeStyle: {
      backgroundImage: `url("${MARBLE_URI}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      border: "1.5px solid #C4963A",
      boxShadow: [
        "0 0 0 3px rgba(196,150,58,0.22)",
        "0 2px 16px rgba(160,120,30,0.22)",
        "inset 0 1.5px 0 rgba(255,250,210,0.98)",
        "inset 0 -1px 0 rgba(180,130,40,0.32)",
      ].join(","),
      animation: "olympoGlow 3.5s ease-in-out infinite",
    },
    textStyle: {
      color: "#5C3800",
      fontWeight: "700",
      fontFamily: "'Cinzel', 'Palatino Linotype', 'Book Antiqua', Palatino, serif",
      letterSpacing: "0.04em",
      textShadow: "0 1px 0 rgba(255,245,200,0.8)",
    } as React.CSSProperties,
    borderRadius: "10px",
  },
  {
    id: "neon",
    label: "Neón",
    icon: Zap,
    badgeStyle: {},
    textStyle: { color: "#00FFFF" },
    borderRadius: "4px",
  },
];

// ── CSS + fuente Cinzel ───────────────────────────────────────────────────────

const BADGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap');

@keyframes titleGoldShimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes titleFirePulse {
  0%,100% { box-shadow: 0 0 8px rgba(249,115,22,0.4); }
  50%      { box-shadow: 0 0 18px rgba(249,115,22,0.75); }
}
@keyframes neonSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes olympoGlow {
  0%,100% {
    box-shadow:
      0 0 0 3px rgba(196,150,58,0.18), 0 2px 10px rgba(160,120,30,0.15),
      inset 0 1.5px 0 rgba(255,250,210,0.98), inset 0 -1px 0 rgba(180,130,40,0.32);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(218,175,68,0.5), 0 2px 24px rgba(196,150,58,0.4),
      inset 0 1.5px 0 rgba(255,252,220,1), inset 0 -1px 0 rgba(196,150,58,0.55);
  }
}
`;

let injected = false;
function ensureInjections() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = BADGE_CSS;
  document.head.appendChild(style);
}

// ── Tamaños ──────────────────────────────────────────────────────────────────

const SIZE_MAP = {
  sm: { icon: 11, font: "11px", pad: "2px 8px" },
  md: { icon: 13, font: "12px", pad: "4px 12px" },
  lg: { icon: 15, font: "14px", pad: "6px 16px" },
} as const;

// ── TitleBadge ───────────────────────────────────────────────────────────────

export function TitleBadge({
  text,
  styleId,
  size = "md",
}: {
  text: string;
  styleId: TitleStyleId;
  size?: "sm" | "md" | "lg";
}) {
  ensureInjections();

  const def = TITLE_STYLES.find((s) => s.id === styleId) ?? TITLE_STYLES[0];
  const Icon = def.icon;
  const { icon: iconSize, font: fontSize, pad: padding } = SIZE_MAP[size];

  // ── Neón: glow que recorre el borde ─────────────────────────────────────
  if (styleId === "neon") {
    const innerBorderRadius = size === "lg" ? "3px" : "2px";
    return (
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          padding: "1.5px",
          borderRadius: "4px",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-70%",
            background: "conic-gradient(from 0deg, transparent 0%, #00FFFF 9%, rgba(0,255,255,0.4) 13%, transparent 18%)",
            animation: "neonSpin 2.4s linear infinite",
          }}
        />
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#03030f",
            borderRadius: innerBorderRadius,
            padding,
            fontSize,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <Icon size={iconSize} strokeWidth={2} style={{ color: "#00FFFF", filter: "drop-shadow(0 0 4px #00FFFF)" }} />
          <span style={{ color: "#00FFFF", textShadow: "0 0 8px rgba(0,255,255,0.8)" }}>{text}</span>
        </span>
      </span>
    );
  }

  // ── Resto ────────────────────────────────────────────────────────────────
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap"
      style={{
        ...def.badgeStyle,
        borderRadius: def.borderRadius,
        padding,
        fontSize,
      }}
    >
      <Icon size={iconSize} strokeWidth={2} style={def.textStyle} />
      <span style={def.textStyle}>{text}</span>
    </span>
  );
}

// ── TitleStylePicker — previews grandes, una fila por estilo ─────────────────

export function TitleStylePicker({
  value,
  onChange,
  previewText,
}: {
  value: TitleStyleId;
  onChange: (id: TitleStyleId) => void;
  previewText?: string;
}) {
  ensureInjections();
  const displayText = previewText && previewText.trim().length >= 3 ? previewText.trim() : undefined;

  return (
    <div className="flex flex-col gap-2">
      {TITLE_STYLES.map((def) => {
        const isSelected = def.id === value;
        return (
          <button
            key={def.id}
            onClick={() => onChange(def.id)}
            className="flex items-center gap-3 rounded-[12px] px-3 py-3 transition-all text-left w-full"
            style={{
              border: isSelected
                ? "1.5px solid var(--color-warm)"
                : "1.5px solid var(--color-border)",
              background: isSelected ? "rgba(239,200,139,0.07)" : "var(--color-surface)",
            }}
          >
            {/* Badge a tamaño grande para verlo bien */}
            <div className="flex-shrink-0">
              <TitleBadge
                text={displayText || def.label}
                styleId={def.id}
                size="lg"
              />
            </div>

            {/* Nombre del estilo */}
            <span className="flex-1 text-[13px] font-medium">{def.label}</span>

            {/* Check cuando está seleccionado */}
            {isSelected && (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-warm)" }}
              >
                <Check size={12} strokeWidth={2.5} style={{ color: "#1a0f00" }} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
