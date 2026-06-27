"use client";

import { Crown, Flame, Sparkles, Landmark, Zap, Check, type LucideIcon } from "lucide-react";

// ── Mármol Olympo: SVG con venas doradas líquidas ────────────────────────────
// Tres trazos superpuestos por vena (oscuro + brillante + reflejo) → efecto metálico

const MARBLE_SVG = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" preserveAspectRatio="xMidYMid slice">`,
  // Base blanca brillante (mármol de Carrara)
  `<rect width="200" height="40" fill="#FAFAFA"/>`,
  // Venas grises del mármol (finas, mármol natural)
  `<path d="M0 31 Q55 26 100 33 Q145 40 200 28" fill="none" stroke="#C5C0B8" stroke-width="0.45" opacity="0.5"/>`,
  `<path d="M28 0 Q29 17 30 40" fill="none" stroke="#C8C3BA" stroke-width="0.32" opacity="0.4"/>`,
  `<path d="M130 0 Q128 13 126 25 Q124 34 128 40" fill="none" stroke="#C2BDB2" stroke-width="0.28" opacity="0.38"/>`,
  `<path d="M80 0 Q82 8 78 18 Q74 28 76 40" fill="none" stroke="#CEC9BF" stroke-width="0.25" opacity="0.3"/>`,
  // ── Vena dorada principal (río horizontal con curva) ──────────────────────
  // Capa 1: base oscura — ancho (profundidad de la grieta)
  `<path d="M-5 13 Q32 9 65 15 Q88 19 104 17 Q142 11 200 21" fill="none" stroke="#9A6C10" stroke-width="4.5" opacity="0.55"/>`,
  // Capa 2: dorado medio — brillante
  `<path d="M-5 13 Q32 9 65 15 Q88 19 104 17 Q142 11 200 21" fill="none" stroke="#D4A020" stroke-width="2.8" opacity="0.85"/>`,
  // Capa 3: reflejo luminoso — fino
  `<path d="M-5 12.5 Q32 8.5 65 14.5 Q88 18.5 104 16.5 Q142 10.5 200 20.5" fill="none" stroke="#FAE050" stroke-width="1" opacity="0.55"/>`,
  // ── Rama de la vena principal (hacia abajo) ───────────────────────────────
  `<path d="M65 15 Q67 25 68 40" fill="none" stroke="#9A6C10" stroke-width="3.2" opacity="0.5"/>`,
  `<path d="M65 15 Q67 25 68 40" fill="none" stroke="#D0A020" stroke-width="2" opacity="0.8"/>`,
  `<path d="M65 15 Q67 25 68 40" fill="none" stroke="#F5D040" stroke-width="0.8" opacity="0.5"/>`,
  // ── Vena secundaria gruesa (lado derecho, casi vertical) ─────────────────
  `<path d="M157 -3 Q161 11 165 22 Q169 34 166 43" fill="none" stroke="#9A6C10" stroke-width="5" opacity="0.5"/>`,
  `<path d="M157 -3 Q161 11 165 22 Q169 34 166 43" fill="none" stroke="#C89820" stroke-width="3.2" opacity="0.8"/>`,
  `<path d="M157 -3 Q161 11 165 22 Q169 34 166 43" fill="none" stroke="#F8DA40" stroke-width="1.2" opacity="0.5"/>`,
  // Pequeña bifurcación de la vena secundaria
  `<path d="M165 22 Q172 27 182 29" fill="none" stroke="#C09020" stroke-width="2" opacity="0.7"/>`,
  `<path d="M165 22 Q172 27 182 29" fill="none" stroke="#F0CA38" stroke-width="0.8" opacity="0.5"/>`,
  // ── Venas finas decorativas ───────────────────────────────────────────────
  `<path d="M0 5 Q14 8 24 14 Q26 17 25 25" fill="none" stroke="#D0A020" stroke-width="0.9" opacity="0.65"/>`,
  `<path d="M104 17 Q108 29 109 40" fill="none" stroke="#C09020" stroke-width="1.2" opacity="0.55"/>`,
  `<path d="M104 17 Q108 29 109 40" fill="none" stroke="#E8C030" stroke-width="0.5" opacity="0.4"/>`,
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
