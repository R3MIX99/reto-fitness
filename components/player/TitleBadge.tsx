"use client";

import { Crown, Flame, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";

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
    label: "Sombra",
    icon: Star,
    badgeStyle: {
      background: "linear-gradient(135deg,#0f0f1a,#1a1a2e)",
      border: "1px solid rgba(192,192,192,0.5)",
      boxShadow: "0 0 14px rgba(192,192,192,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
    },
    textStyle: { color: "#C0C0C0" },
    borderRadius: "6px",
  },
  {
    id: "neon",
    label: "Neón",
    icon: Zap,
    badgeStyle: {
      background: "transparent",
      border: "1.5px solid #00FFFF",
      boxShadow: "0 0 8px #00FFFF, 0 0 20px rgba(0,255,255,0.2), inset 0 0 8px rgba(0,255,255,0.05)",
    },
    textStyle: {
      color: "#00FFFF",
      textShadow: "0 0 8px rgba(0,255,255,0.8)",
    },
    borderRadius: "4px",
  },
];

// ── Keyframes (inyectados una sola vez) ──────────────────────────────────────

const BADGE_KEYFRAMES = `
@keyframes titleGoldShimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes titleFirePulse {
  0%,100% { box-shadow: 0 0 8px rgba(249,115,22,0.4); }
  50%      { box-shadow: 0 0 18px rgba(249,115,22,0.75); }
}
`;

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected || typeof document === "undefined") return;
  keyframesInjected = true;
  const s = document.createElement("style");
  s.textContent = BADGE_KEYFRAMES;
  document.head.appendChild(s);
}

// ── TitleBadge: renderiza el badge con texto y estilo ────────────────────────

export function TitleBadge({
  text,
  styleId,
  size = "md",
}: {
  text: string;
  styleId: TitleStyleId;
  size?: "sm" | "md";
}) {
  ensureKeyframes();
  const def = TITLE_STYLES.find((s) => s.id === styleId) ?? TITLE_STYLES[0];
  const Icon = def.icon;
  const iconSize = size === "sm" ? 11 : 13;
  const fontSize = size === "sm" ? "11px" : "12px";

  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap"
      style={{
        ...def.badgeStyle,
        borderRadius: def.borderRadius,
        padding: size === "sm" ? "2px 8px" : "4px 12px",
        fontSize,
      }}
    >
      <Icon size={iconSize} strokeWidth={2} style={def.textStyle} />
      <span style={def.textStyle}>{text}</span>
    </span>
  );
}

// ── TitleStylePicker: selector visual de los 5 estilos ───────────────────────

export function TitleStylePicker({
  value,
  onChange,
  previewText,
}: {
  value: TitleStyleId;
  onChange: (id: TitleStyleId) => void;
  previewText?: string;
}) {
  ensureKeyframes();
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
