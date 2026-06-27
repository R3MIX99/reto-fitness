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

// ── Estilos ──────────────────────────────────────────────────────────────────

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
    // Olympo: se renderiza con rama especial — badgeStyle/textStyle no se usan directamente
    id: "shadow",
    label: "Olympo",
    icon: Landmark,
    badgeStyle: {},
    textStyle: {},
    borderRadius: "12px",
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

// ── CSS global inyectado una vez ──────────────────────────────────────────────

const BADGE_CSS = `
@font-face {
  font-family: 'GodOfWar';
  src: url('/fonts/GodOfWar.ttf') format('truetype');
  font-display: swap;
}
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
@keyframes olympoShimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes olympoRotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
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
  sm: { icon: 11, font: "11px", pad: "2px 8px",  glowR: "6px",  bodyR: "4px"  },
  md: { icon: 13, font: "12px", pad: "4px 12px", glowR: "7px",  bodyR: "5px"  },
  lg: { icon: 15, font: "14px", pad: "6px 20px", glowR: "8px",  bodyR: "6px"  },
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
  const sz = SIZE_MAP[size];

  // ── Olympo: badge especial con luz viajera ───────────────────────────────
  if (styleId === "shadow") {
    return (
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>

        {/* Anillo de luz que gira por el borde */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-2px",
            borderRadius: sz.glowR,
            overflow: "hidden",
            zIndex: 0,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: "-100%",
              background: [
                "conic-gradient(from 0deg,",
                "  transparent 0%,",
                "  transparent 62%,",
                "  rgba(160,110,0,0.45) 72%,",
                "  rgba(255,230,100,0.85) 80%,",
                "  rgba(255,255,255,1) 85%,",
                "  rgba(255,230,100,0.85) 90%,",
                "  rgba(160,110,0,0.45) 96%,",
                "  transparent 100%",
                ")",
              ].join(""),
              animation: "olympoRotate 2.8s linear infinite",
            }}
          />
        </span>

        {/* Cuerpo del badge: fondo plata-dorado animado */}
        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: sz.pad,
            borderRadius: sz.bodyR,
            overflow: "hidden",
            whiteSpace: "nowrap",
            backgroundImage: [
              "linear-gradient(135deg,",
              "  #C0C0C0 0%,",
              "  #EFEFEF 15%,",
              "  #D8A820 30%,",
              "  #FFD700 46%,",
              "  #FFFFFF 58%,",
              "  #C8C8C8 72%,",
              "  #D4A020 85%,",
              "  #E8E8E8 100%",
              ")",
            ].join(""),
            backgroundSize: "300% 300%",
            animation: "olympoShimmer 3.5s ease-in-out infinite",
          }}
        >
            {/* Texto con fuente God of War + glow */}
          <span
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'GodOfWar', 'Cinzel', serif",
              fontSize: sz.font,
              fontWeight: "400",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.97)",
              textShadow: [
                "0 0 6px rgba(255,255,255,0.9)",
                "0 0 14px rgba(255,255,255,0.7)",
                "0 0 28px rgba(255,220,80,0.55)",
                "0 0 48px rgba(255,180,0,0.3)",
                "0 1px 3px rgba(0,0,0,0.5)",
              ].join(","),
            }}
          >
            {text}
          </span>
        </span>
      </span>
    );
  }

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
            padding: sz.pad,
            fontSize: sz.font,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <Icon size={sz.icon} strokeWidth={2} style={{ color: "#00FFFF", filter: "drop-shadow(0 0 4px #00FFFF)" }} />
          <span style={{ color: "#00FFFF", textShadow: "0 0 8px rgba(0,255,255,0.8)" }}>{text}</span>
        </span>
      </span>
    );
  }

  // ── Resto de estilos ─────────────────────────────────────────────────────
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap"
      style={{
        ...def.badgeStyle,
        borderRadius: def.borderRadius,
        padding: sz.pad,
        fontSize: sz.font,
      }}
    >
      <Icon size={sz.icon} strokeWidth={2} style={def.textStyle} />
      <span style={def.textStyle}>{text}</span>
    </span>
  );
}

// ── TitleStylePicker ─────────────────────────────────────────────────────────

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
            <div className="flex-shrink-0">
              <TitleBadge
                text={displayText || def.label}
                styleId={def.id}
                size="lg"
              />
            </div>
            <span className="flex-1 text-[13px] font-medium">{def.label}</span>
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
