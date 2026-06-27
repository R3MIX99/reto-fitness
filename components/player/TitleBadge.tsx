"use client";

import { Crown, Flame, Sparkles, Landmark, Zap, type LucideIcon } from "lucide-react";

// ── Definición de los 5 estilos ──────────────────────────────────────────────

export type TitleStyleId = "gold" | "fire" | "crystal" | "shadow" | "neon";

export interface TitleStyleDef {
  id: TitleStyleId;
  label: string;
  icon: LucideIcon;
  badgeStyle: React.CSSProperties;
  textStyle: React.CSSProperties;
  borderRadius: string;
}

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
      // Mármol blanco con venas doradas — estilo piedra mítica griega
      background: [
        "linear-gradient(112deg, rgba(218,175,68,0.18) 0%, transparent 35%, rgba(218,175,68,0.1) 70%, transparent 100%)",
        "linear-gradient(175deg, rgba(218,175,68,0.08) 0%, transparent 50%)",
        "linear-gradient(180deg, #fefaf0 0%, #f5e9cc 55%, #f9f3e1 100%)",
      ].join(","),
      border: "1.5px solid #C4963A",
      boxShadow: [
        "0 0 0 3px rgba(196,150,58,0.2)",
        "0 2px 14px rgba(160,120,30,0.2)",
        "inset 0 1.5px 0 rgba(255,248,200,0.95)",
        "inset 0 -1px 0 rgba(180,130,40,0.3)",
      ].join(","),
      animation: "olympoGlow 3.5s ease-in-out infinite",
    },
    textStyle: { color: "#6B4500", fontWeight: "600" } as React.CSSProperties,
    borderRadius: "10px",
  },
  {
    id: "neon",
    label: "Neón",
    icon: Zap,
    // Renderizado especial en TitleBadge (glow viajero); estos valores son ignorados
    badgeStyle: {},
    textStyle: { color: "#00FFFF" },
    borderRadius: "4px",
  },
];

// ── Inyección de CSS + SVG (una sola vez por sesión) ─────────────────────────

const BADGE_KEYFRAMES = `
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
    box-shadow: 0 0 0 3px rgba(196,150,58,0.18), 0 2px 10px rgba(160,120,30,0.15),
                inset 0 1.5px 0 rgba(255,248,200,0.95), inset 0 -1px 0 rgba(180,130,40,0.3);
  }
  50% {
    box-shadow: 0 0 0 3px rgba(218,175,68,0.45), 0 2px 22px rgba(196,150,58,0.35),
                inset 0 1.5px 0 rgba(255,252,220,1), inset 0 -1px 0 rgba(196,150,58,0.5);
  }
}
`;

let injected = false;

function ensureInjections() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = BADGE_KEYFRAMES;
  document.head.appendChild(style);
}

// ── TitleBadge ───────────────────────────────────────────────────────────────

export function TitleBadge({
  text,
  styleId,
  size = "md",
}: {
  text: string;
  styleId: TitleStyleId;
  size?: "sm" | "md";
}) {
  ensureInjections();

  const def = TITLE_STYLES.find((s) => s.id === styleId) ?? TITLE_STYLES[0];
  const Icon = def.icon;
  const iconSize = size === "sm" ? 11 : 13;
  const fontSize = size === "sm" ? "11px" : "12px";
  const padding = size === "sm" ? "2px 8px" : "4px 12px";

  // ── Neón: glow que recorre el borde en loop ──────────────────────────────
  if (styleId === "neon") {
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
        {/* Gradiente cónico giratorio → crea el efecto "glow que viaja" */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-70%",
            background: "conic-gradient(from 0deg, transparent 0%, #00FFFF 9%, rgba(0,255,255,0.4) 13%, transparent 18%)",
            animation: "neonSpin 2.4s linear infinite",
          }}
        />
        {/* Fondo interior que tapa el centro del gradiente giratorio */}
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "#03030f",
            borderRadius: "2px",
            padding,
            fontSize,
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <Icon
            size={iconSize}
            strokeWidth={2}
            style={{ color: "#00FFFF", filter: "drop-shadow(0 0 4px #00FFFF)" }}
          />
          <span style={{ color: "#00FFFF", textShadow: "0 0 8px rgba(0,255,255,0.8)" }}>
            {text}
          </span>
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
        padding,
        fontSize,
      }}
    >
      <Icon size={iconSize} strokeWidth={2} style={def.textStyle} />
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
  return (
    <div className="flex flex-wrap gap-2">
      {TITLE_STYLES.map((def) => {
        const isSelected = def.id === value;
        return (
          <button
            key={def.id}
            onClick={() => onChange(def.id)}
            className="flex flex-col items-center gap-1.5 p-2 rounded-[10px] transition-all"
            style={{
              border: isSelected ? "1.5px solid var(--color-warm)" : "1.5px solid var(--color-border)",
              background: isSelected ? "rgba(239,200,139,0.08)" : "var(--color-surface)",
              minWidth: 68,
            }}
          >
            <TitleBadge
              text={previewText || def.label}
              styleId={def.id}
              size="sm"
            />
            <span className="text-[10px] text-[var(--color-muted)]">{def.label}</span>
          </button>
        );
      })}
    </div>
  );
}
