"use client";

import { Crown, Flame, Sparkles, Landmark, Zap, Check, type LucideIcon } from "lucide-react";

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
      // Mármol marfil con venas doradas visibles (rayos de Zeus)
      // Capa 3 base: marfil cálido
      // Capas 2-1: venas doradas angostas y diagonales a distintos ángulos
      background: [
        // Vena principal gruesa — diagonal 68°
        `linear-gradient(68deg,
          transparent 0%, transparent 14%,
          rgba(210,165,45,0.85) 14.2%, rgba(235,190,70,0.55) 15%, rgba(210,165,45,0.25) 15.7%, transparent 16.5%,
          transparent 42%,
          rgba(200,158,40,0.6) 42.3%, rgba(225,180,60,0.35) 43%, transparent 43.7%,
          transparent 100%
        )`,
        // Vena secundaria — diagonal opuesta 128°
        `linear-gradient(128deg,
          transparent 0%, transparent 28%,
          rgba(196,148,38,0.7) 28.2%, rgba(220,178,58,0.4) 28.9%, transparent 29.6%,
          transparent 58%,
          rgba(190,145,35,0.5) 58.2%, rgba(215,172,55,0.28) 58.9%, transparent 59.5%,
          transparent 100%
        )`,
        // Vena fina rápida — 50°
        `linear-gradient(50deg,
          transparent 60%,
          rgba(205,162,42,0.55) 60.1%, rgba(228,185,65,0.3) 60.6%, transparent 61.1%,
          transparent 100%
        )`,
        // Base marfil cálido
        `linear-gradient(160deg, #fefaf2 0%, #f4e8c6 25%, #fdf5e0 52%, #ece0bb 78%, #f8f2e3 100%)`,
      ].join(","),
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
