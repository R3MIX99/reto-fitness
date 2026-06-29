"use client";

import { motion } from "framer-motion";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const GOLD  = "#EFC88B";
const TERRA = "#CF5C36";
const FG    = "#EEE5E9";
const MUTED = "#7C7C7C";
const CARD  = "#111111";

// ─── ProgressRing ─────────────────────────────────────────────────────────────
function Ring({ pct, color, size = 48, stroke = 4 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" />
    </svg>
  );
}

// ─── Dashboard screen ─────────────────────────────────────────────────────────
function DashboardScreen() {
  const font = "'Inter', system-ui, sans-serif";
  const mono = "'Courier New', monospace";

  return (
    <div style={{ background: "#000", width: "100%", height: "100%", overflowY: "hidden", fontFamily: font, position: "relative" }}>

      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px 0", fontSize: 11, fontWeight: 600, color: FG }}>
        <span>12:02</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><rect x="0" y="3" width="3" height="7" rx="0.5" fill={FG} opacity="0.4"/><rect x="4" y="2" width="3" height="8" rx="0.5" fill={FG} opacity="0.6"/><rect x="8" y="0" width="3" height="10" rx="0.5" fill={FG}/><rect x="12.5" y="1.5" width="1.5" height="7" rx="0.3" fill={FG} opacity="0.3"/></svg>
          <div style={{ display: "flex", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.15)", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>
            <span style={{ color: GOLD, fontWeight: 700 }}>13</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 18px 0", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #3a5a3a, #1a3a2a)", border: "2px solid rgba(239,200,139,0.3)", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg, #4a7a5a 0%, #2a5a3a 100%)" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Buenas noches,</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: FG }}>Andre<span style={{ color: GOLD }}>.</span></p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#181818", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={FG} strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
      </div>

      {/* Points card */}
      <div style={{ margin: "14px 16px 0", background: CARD, borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Puntos de hoy</span>
          <span style={{ fontSize: 10, color: GOLD }}>1 temporada activa</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 800, color: FG }}>0</span>
          <span style={{ fontSize: 16, color: MUTED }}>/13</span>
        </div>
        <div style={{ height: 4, background: "#222", borderRadius: 100, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ width: "0%", height: "100%", background: GOLD, borderRadius: 100 }} />
        </div>
        <p style={{ margin: 0, fontSize: 10, color: MUTED }}>Completa el día de hoy para comenzar tu racha.</p>
      </div>

      {/* Racha + Rival */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "8px 16px 0" }}>
        <div style={{ background: CARD, borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={TERRA}><path d="M12 2C7 7 4 10 4 14a8 8 0 0 0 16 0c0-4-3-7-8-12z"/></svg>
          <div>
            <p style={{ margin: 0, fontSize: 9, color: MUTED }}>Racha</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: FG }}>6 días</p>
          </div>
        </div>
        <div style={{ background: CARD, borderRadius: 16, padding: "12px 14px" }}>
          <p style={{ margin: "0 0 2px", fontSize: 9, color: MUTED }}>Tu rival</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: FG }}>Noémi · 48 pts</p>
        </div>
      </div>

      {/* Temporadas label */}
      <p style={{ margin: "14px 18px 8px", fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase" }}>TEMPORADAS EN CURSO</p>

      {/* Season card */}
      <div style={{ margin: "0 16px", background: CARD, borderRadius: 18, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: GOLD, lineHeight: 1, fontFamily: mono }}>#1</span>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: FG }}>Temporada 1</p>
            <p style={{ margin: 0, fontSize: 10, color: MUTED }}>Olympo</p>
          </div>
        </div>
        <p style={{ margin: "0 0 2px", fontSize: 10, color: MUTED }}>de 2 jugadores</p>

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "8px 0 2px" }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: FG }}>60</span>
          <span style={{ fontSize: 10, color: MUTED }}>/ 364 pts de la temporada</span>
          <span style={{ fontSize: 10, color: MUTED, marginLeft: "auto" }}>Día 6/28</span>
        </div>

        {/* Season progress bar */}
        <div style={{ height: 3, background: "#222", borderRadius: 100, margin: "6px 0 2px", overflow: "hidden" }}>
          <div style={{ width: "21%", height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${TERRA})`, borderRadius: 100 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 8, color: "#3a3a3a" }}>Inicio</span>
          <span style={{ fontSize: 8, color: MUTED }}>21% de la temporada</span>
          <span style={{ fontSize: 8, color: "#3a3a3a" }}>Fin</span>
        </div>

        <p style={{ margin: "0 0 6px", fontSize: 9, color: MUTED }}>Posiciones cercanas</p>

        {/* Leaderboard rows */}
        <div style={{ background: "#181818", borderRadius: 12, padding: "10px 14px", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, width: 10 }}>1</span>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #3a5a3a, #1a3a2a)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: FG, fontWeight: 500 }}>Tú</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>60</span>
          </div>
        </div>
        <div style={{ padding: "8px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: MUTED, width: 10 }}>2</span>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #8a3a3a, #5a1a1a)", flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: FG }}>Rich Páez</span>
            <span style={{ fontSize: 10, color: "#e05555", marginRight: 4 }}>-18</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: FG }}>42</span>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{ position: "absolute", bottom: 12, left: 16, right: 16 }}>
        <div style={{ background: "#181818", borderRadius: 100, padding: "10px 20px", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
          {[
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>, active: true },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, active: false },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>, active: false },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, active: false },
            { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6,9 12,15 18,9"/></svg>, active: false },
          ].map(({ icon, active }, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {icon}
              {active && <div style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD }} />}
            </div>
          ))}
        </div>
        {/* Home indicator */}
        <div style={{ width: 100, height: 4, background: "rgba(255,255,255,0.25)", borderRadius: 100, margin: "8px auto 0" }} />
      </div>
    </div>
  );
}

// ─── iPhone 15 Pro shell ──────────────────────────────────────────────────────
export function IPhoneMockup() {
  const W = 270;
  const H = 580;
  const R = 48;
  const SCREEN_INSET = 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.6, ease: [0.32, 0.72, 0, 1] }}
      style={{ perspective: 1200 }}
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative", width: W, height: H }}
      >
        {/* Glow behind phone */}
        <div aria-hidden style={{
          position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
          width: W * 1.2, height: H * 0.7, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(239,200,139,0.15) 0%, transparent 70%)",
          filter: "blur(30px)", zIndex: 0,
        }} />

        {/* Phone body */}
        <div style={{
          position: "relative", zIndex: 1,
          width: W, height: H,
          background: "linear-gradient(160deg, #2a2a2a 0%, #111 40%, #1a1a1a 100%)",
          borderRadius: R,
          boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 0 0 2px #111, 0 40px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}>

          {/* Screen */}
          <div style={{
            position: "absolute",
            top: SCREEN_INSET, left: SCREEN_INSET,
            right: SCREEN_INSET, bottom: SCREEN_INSET,
            background: "#000",
            borderRadius: R - SCREEN_INSET,
            overflow: "hidden",
          }}>
            <DashboardScreen />
          </div>

          {/* Dynamic island */}
          <div style={{
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            width: 100, height: 28,
            background: "#000",
            borderRadius: 100,
            zIndex: 10,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
          }} />

          {/* Side button left top */}
          <div style={{ position: "absolute", left: -3, top: 90, width: 3, height: 32, background: "#333", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 132, width: 3, height: 52, background: "#333", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 196, width: 3, height: 52, background: "#333", borderRadius: "2px 0 0 2px" }} />
          {/* Power button right */}
          <div style={{ position: "absolute", right: -3, top: 140, width: 3, height: 80, background: "#333", borderRadius: "0 2px 2px 0" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}
