"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Trophy, Zap, Users, Camera, Calendar, ChevronRight,
  Check, Menu, X, Flame, Star, Shield, TrendingUp,
  Target, Award,
} from "lucide-react";

// ─── Tokens ──────────────────────────────────────────────────────────────────
const GOLD   = "#EFC88B";
const TERRA  = "#CF5C36";
const FG     = "#EEE5E9";
const BG     = "#040506";
const MUTED  = "#5a5a5a";
const CARD   = "#0a0b0d";

// ─── Aurora Hero Background ───────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      <div style={{ position: "absolute", inset: 0, background: BG }} />
      <motion.div
        style={{ position: "absolute", top: "-20%", left: "30%", width: 900, height: 700, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(239,200,139,0.18) 0%, transparent 65%)`, filter: "blur(60px)" }}
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ position: "absolute", top: "10%", left: "-10%", width: 700, height: 600, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(207,92,54,0.12) 0%, transparent 60%)`, filter: "blur(80px)" }}
        animate={{ x: [0, 100, 50, 0], y: [0, 80, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      <motion.div
        style={{ position: "absolute", bottom: "0%", right: "10%", width: 600, height: 500, borderRadius: "50%", background: `radial-gradient(ellipse, rgba(239,200,139,0.08) 0%, transparent 60%)`, filter: "blur(100px)" }}
        animate={{ x: [0, -60, 30, 0], y: [0, -40, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(4,5,6,0.7) 100%)" }} />
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <>
      <nav style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 1000, width: "calc(100% - 32px)", maxWidth: 1100,
        background: scrolled ? "rgba(4,5,6,0.94)" : "rgba(4,5,6,0.6)",
        backdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 100,
        padding: "10px 12px 10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "background 0.4s ease, box-shadow 0.4s ease",
        boxShadow: scrolled ? "0 8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/icons/logo.png" alt="Olympo" width={26} height={26} />
          <span style={{ fontSize: 14, fontWeight: 700, color: FG, letterSpacing: "0.08em", fontFamily: "var(--font-inter, sans-serif)" }}>OLYMPO</span>
        </Link>

        <div className="hidden md:flex" style={{ gap: 4, alignItems: "center" }}>
          {[["#como-funciona", "Cómo funciona"], ["#features", "Features"], ["#planes", "Planes"]].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: MUTED, textDecoration: "none", padding: "7px 14px", borderRadius: 100, transition: "color 0.2s, background 0.2s", fontFamily: "var(--font-inter, sans-serif)" }}
              onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.background = "transparent"; }}>{label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Link href="/login" className="hidden md:block" style={{ fontSize: 13, color: MUTED, textDecoration: "none", padding: "8px 16px", fontFamily: "var(--font-inter, sans-serif)", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = FG)}
            onMouseLeave={e => (e.currentTarget.style.color = MUTED)}>
            Iniciar sesión
          </Link>
          <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: "#1a1000", background: GOLD, borderRadius: 100, padding: "9px 20px", textDecoration: "none", fontFamily: "var(--font-inter, sans-serif)", transition: "box-shadow 0.2s, transform 0.2s", boxShadow: "0 0 20px rgba(239,200,139,0.25)" }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 0 40px rgba(239,200,139,0.4)"; e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(239,200,139,0.25)"; e.currentTarget.style.transform = "scale(1)"; }}>
            Entrar gratis
          </Link>
          <button onClick={() => setOpen(o => !o)} className="md:hidden" style={{ background: "transparent", border: "none", color: MUTED, cursor: "pointer", padding: 6 }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(4,5,6,0.97)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48 }}>
            <button onClick={() => setOpen(false)} style={{ position: "absolute", top: 28, right: 28, background: "transparent", border: "none", color: MUTED, cursor: "pointer" }}><X size={24} /></button>
            {[["#como-funciona", "Cómo funciona"], ["#features", "Features"], ["#planes", "Planes"]].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} style={{ fontSize: 32, fontWeight: 700, color: FG, textDecoration: "none", fontFamily: "var(--font-inter, sans-serif)" }}>{label}</a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} style={{ fontSize: 16, fontWeight: 600, color: "#1a1000", background: GOLD, borderRadius: 100, padding: "14px 44px", textDecoration: "none" }}>Entrar gratis</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Hero phone image with gradient + stats overlay ──────────────────────────
function HeroPhone() {
  const stats = [
    { value: "13",   label: "puntos / día" },
    { value: "7",    label: "días activos" },
    { value: "100%", label: "con evidencia" },
    { value: "×3",   label: "bonus racha" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.5 }}
      style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto" }}>

      {/* Glow behind phone */}
      <div aria-hidden style={{
        position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)",
        width: 340, height: 300, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(239,200,139,0.12) 0%, transparent 70%)",
        filter: "blur(40px)", zIndex: 0,
      }} />

      {/* Phone image — cropped at bottom via overflow hidden */}
      <div style={{ position: "relative", zIndex: 1, borderRadius: 48, overflow: "hidden" }}>
        <Image
          src="/mockup-hero.png"
          alt="Olympo app dashboard"
          width={360}
          height={700}
          style={{ width: "100%", height: "auto", display: "block" }}
          priority
        />

        {/* Gradient fade — covers bottom ~35% of image */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: "42%",
          background: `linear-gradient(to bottom, transparent 0%, rgba(4,5,6,0.75) 40%, ${BG} 85%)`,
        }} />

        {/* Stats overlaid on gradient */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 20px 28px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
        }}>
          {stats.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08, duration: 0.5 }}
              style={{
                background: "rgba(10,11,13,0.7)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                padding: "12px 14px",
                backdropFilter: "blur(12px)",
              }}>
              <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: GOLD, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 10, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.4 }}>{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: "100dvh",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "130px 24px 80px",
      position: "relative", overflow: "hidden",
      textAlign: "center",
    }}>
      <AuroraBackground />

      {/* Glow behind title */}
      <div aria-hidden style={{
        position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
        width: 700, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(239,200,139,0.10) 0%, transparent 65%)",
        filter: "blur(60px)", zIndex: 0, pointerEvents: "none",
      }} />

      {/* Glow behind phone */}
      <div aria-hidden style={{
        position: "absolute", bottom: "5%", left: "50%", transform: "translateX(-50%)",
        width: 400, height: 600, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(239,200,139,0.08) 0%, transparent 65%)",
        filter: "blur(50px)", zIndex: 0, pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>

        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.18)", borderRadius: 100, padding: "6px 16px 6px 12px", marginBottom: 28 }}>
          <Flame size={13} style={{ color: GOLD }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Competencia entre amigos</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontFamily: "var(--font-display, var(--font-inter, sans-serif))",
            fontSize: "clamp(60px, 9vw, 120px)",
            fontWeight: 700, color: FG,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            margin: "0 0 32px",
          }}>
          El más<br />constante{" "}
          <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${TERRA} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>gana.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
          style={{ fontSize: "clamp(15px, 1.5vw, 18px)", color: "#7a7b7c", lineHeight: 1.75, maxWidth: 620, margin: "0 0 40px", fontFamily: "var(--font-inter, sans-serif)" }}>
          Crea un grupo con tus amigos, registra cada entrenamiento con evidencia fotográfica, y compite semana a semana por el título de campeón.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 64 }}>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GOLD, color: "#1a1000", fontSize: 15, fontWeight: 700, borderRadius: 100, padding: "15px 30px", textDecoration: "none", boxShadow: "0 0 50px rgba(239,200,139,0.25), 0 4px 20px rgba(0,0,0,0.3)", fontFamily: "var(--font-inter, sans-serif)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 70px rgba(239,200,139,0.4), 0 8px 30px rgba(0,0,0,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 50px rgba(239,200,139,0.25), 0 4px 20px rgba(0,0,0,0.3)"; }}>
            Empieza gratis
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ChevronRight size={14} strokeWidth={2.5} />
            </div>
          </Link>
          <a href="#como-funciona" style={{ display: "inline-flex", alignItems: "center", fontSize: 15, color: MUTED, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100, padding: "15px 30px", textDecoration: "none", fontFamily: "var(--font-inter, sans-serif)", transition: "color 0.2s, border-color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.color = FG; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
            Ver cómo funciona
          </a>
        </motion.div>

        {/* Foto real + degradado + stats */}
        <HeroPhone />
      </div>
    </section>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const stats = [
    { value: "13", label: "puntos máx. por día" },
    { value: "7", label: "días de competencia semanal" },
    { value: "100%", label: "con evidencia fotográfica" },
    { value: "×3", label: "bonus por racha perfecta" },
  ];
  return (
    <section ref={ref} style={{ padding: "0 24px 100px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 1, background: "rgba(255,255,255,0.04)", borderRadius: 20, overflow: "hidden" }}>
        {stats.map(({ value, label }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.08, duration: 0.5 }}
            style={{ background: CARD, padding: "36px 28px", textAlign: "center" }}>
            <p style={{ margin: "0 0 8px", fontSize: 44, fontWeight: 800, color: GOLD, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
            <p style={{ margin: 0, fontSize: 13, color: MUTED, fontFamily: "var(--font-inter, sans-serif)" }}>{label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Cómo funciona ────────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const steps = [
    { num: "01", title: "Crea tu grupo", icon: <Users size={22} strokeWidth={1.5} />, desc: "Invita a tus amigos con un enlace o código. El grupo es privado — solo los miembros ven el leaderboard y las evidencias." },
    { num: "02", title: "Registra tus hábitos", icon: <Camera size={22} strokeWidth={1.5} />, desc: "Cada check requiere foto de evidencia. Gimnasio, dieta, metas personalizadas. Sin foto, el punto no cuenta. Sin trampa." },
    { num: "03", title: "Compite y gana", icon: <Trophy size={22} strokeWidth={1.5} />, desc: "El marcador se actualiza en tiempo real. Al cierre de temporada, el más constante recibe el título de Campeón en su perfil." },
  ];
  return (
    <section id="como-funciona" ref={ref} style={{ padding: "0 24px 120px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} style={{ marginBottom: 64 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Cómo funciona</span>
        <h2 style={{ margin: "12px 0 0", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Simple. Honesto. Competitivo.</h2>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
        {steps.map(({ num, title, desc, icon }, i) => (
          <motion.div key={num} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.12, duration: 0.6 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            style={{ background: CARD, border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, padding: "36px 32px", cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}>{icon}</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#2a2a2a", fontFamily: "var(--font-mono, monospace)" }}>{num}</span>
            </div>
            <h3 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 15, color: "#6a6b6c", lineHeight: 1.7, fontFamily: "var(--font-inter, sans-serif)" }}>{desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function EliteBadge() {
  return <span style={{ fontSize: 9, fontWeight: 700, color: GOLD, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.2)", borderRadius: 100, padding: "3px 9px", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, fontFamily: "var(--font-inter, sans-serif)" }}>Elite</span>;
}
function ProBadge() {
  return <span style={{ fontSize: 9, fontWeight: 700, color: "#9664ff", background: "rgba(150,100,255,0.1)", border: "1px solid rgba(150,100,255,0.2)", borderRadius: 100, padding: "3px 9px", letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0, fontFamily: "var(--font-inter, sans-serif)" }}>Pro</span>;
}

// ─── Bento card wrapper ───────────────────────────────────────────────────────
function BentoCard({ children, delay = 0, gridColumn }: { children: React.ReactNode; delay?: number; gridColumn: string; }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      style={{ gridColumn, background: CARD, border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, overflow: "hidden" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(239,200,139,0.12)")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
      {children}
    </motion.div>
  );
}

// ─── Bento Features ───────────────────────────────────────────────────────────
function BentoFeatures() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section id="features" ref={ref} style={{ padding: "0 24px 120px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} style={{ marginBottom: 48 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Features</span>
        <h2 style={{ margin: "12px 0 0", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Todo lo que necesitas para ganar.</h2>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 8 }}>

        {/* Leaderboard — span 7 */}
        <BentoCard delay={0} gridColumn="span 7">
          <div style={{ padding: "32px 32px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}><Trophy size={18} strokeWidth={1.5} /></div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Leaderboard en tiempo real</h3>
            </div>
            <p style={{ margin: "0 0 28px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Cada check suma puntos al instante. Siempre sabes exactamente dónde estás y cuánto le llevas a tu rival.</p>
          </div>
          <div style={{ padding: "0 24px 24px" }}>
            {[{ pos: 1, name: "Tú", pts: 79, color: GOLD }, { pos: 2, name: "Carlos", pts: 71, color: "#C0C0C0" }, { pos: 3, name: "Rodrigo", pts: 58, color: "#CD7F32" }].map(({ pos, name, pts, color }) => (
              <div key={pos} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color, width: 16, fontFamily: "var(--font-mono, monospace)" }}>{pos}</span>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: FG }}>{name[0]}</span>
                </div>
                <span style={{ flex: 1, fontSize: 13, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "var(--font-mono, monospace)" }}>{pts} pts</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Racha — span 5 */}
        <BentoCard delay={0.08} gridColumn="span 5">
          <div style={{ padding: "32px", height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(207,92,54,0.1)", border: "1px solid rgba(207,92,54,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: TERRA }}><Flame size={18} strokeWidth={1.5} /></div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Rachas y bonus</h3>
            </div>
            <p style={{ margin: "0 0 32px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>3 días perfectos consecutivos = +3 pts bonus. La constancia tiene recompensa.</p>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 16 }}>
                {[true, true, true, true, false, true, true].map((done, i) => (
                  <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: done ? "rgba(207,92,54,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${done ? "rgba(207,92,54,0.4)" : "rgba(255,255,255,0.06)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <Flame size={12} style={{ color: TERRA }} />}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(207,92,54,0.08)", border: "1px solid rgba(207,92,54,0.15)", borderRadius: 12, padding: "10px 16px" }}>
                <Zap size={14} style={{ color: GOLD }} />
                <span style={{ fontSize: 12, color: GOLD, fontFamily: "var(--font-mono, monospace)" }}>Racha 6 días → +3 pts esta semana</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Evidencia — span 4 */}
        <BentoCard delay={0.16} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}><Camera size={18} strokeWidth={1.5} /></div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Sin trampa</h3>
            </div>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Cada check requiere foto de evidencia. Si no hay foto, el punto no cuenta.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[GOLD, TERRA, "#3a8a5a", "#4a5a8a"].map((c, i) => (
                <div key={i} style={{ aspectRatio: "1.2", borderRadius: 10, background: `${c}15`, border: `1px solid ${c}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={16} style={{ color: `${c}80` }} />
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Temporadas — span 4 */}
        <BentoCard delay={0.2} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(100,150,255,0.1)", border: "1px solid rgba(100,150,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6496ff" }}><Calendar size={18} strokeWidth={1.5} /></div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Temporadas</h3>
            </div>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Compite por temporadas. Cada una tiene su propio campeón y historial permanente.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ label: "T1 · Invierno 2025", done: true, active: false }, { label: "T2 · Primavera 2026", done: true, active: false }, { label: "T3 · Verano 2026", done: false, active: true }].map(({ label, done, active }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? GOLD : done ? "#3a5a3a" : "#2a2a2a", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: active ? GOLD : done ? "#6a7a6a" : "#3a3a3a", fontFamily: "var(--font-mono, monospace)", flex: 1 }}>{label}</span>
                  {active && <span style={{ fontSize: 9, fontWeight: 700, color: GOLD, background: "rgba(239,200,139,0.1)", borderRadius: 100, padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Activa</span>}
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Liga — span 4 */}
        <BentoCard delay={0.24} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}><Star size={18} strokeWidth={1.5} /></div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Liga de grupos</h3>
              </div>
              <EliteBadge />
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Enfrenta tu grupo contra otros. El más constante de la liga gana el título de temporada.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[{ name: "Los Spartan", pts: 412, pos: 1 }, { name: "Iron Squad", pts: 389, pos: 2 }, { name: "Tu grupo", pts: 341, pos: 3, you: true }].map(({ name, pts, pos, you }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: you ? "rgba(239,200,139,0.06)" : "transparent" }}>
                  <span style={{ fontSize: 11, color: MUTED, width: 14, fontFamily: "var(--font-mono, monospace)" }}>{pos}</span>
                  <span style={{ flex: 1, fontSize: 13, color: you ? GOLD : FG, fontFamily: "var(--font-inter, sans-serif)" }}>{name}</span>
                  <span style={{ fontSize: 12, color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{pts}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Títulos — span 8 */}
        <BentoCard delay={0.28} gridColumn="span 8">
          <div style={{ padding: "32px 32px 0", display: "flex", gap: 32, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD }}><Award size={18} strokeWidth={1.5} /></div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Títulos de campeón</h3>
                </div>
                <EliteBadge />
              </div>
              <p style={{ margin: "0 0 24px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Cada temporada tiene su propio título personalizado. El ganador lo lleva grabado en su perfil para siempre.</p>
            </div>
            <div style={{ display: "flex", gap: 10, paddingBottom: 24 }}>
              {[{ title: "El Titán", season: "T1 · Invierno", color: "#C0C0C0" }, { title: "El Imparable", season: "T2 · Primavera", color: GOLD }].map(({ title, season, color }) => (
                <div key={title} style={{ background: "#0d0e10", border: `1px solid ${color}30`, borderRadius: 16, padding: "16px 20px", minWidth: 140 }}>
                  <Trophy size={18} style={{ color, marginBottom: 10 }} strokeWidth={1.5} />
                  <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)" }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 10, color: MUTED, fontFamily: "var(--font-mono, monospace)" }}>{season}</p>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Metas — span 4 */}
        <BentoCard delay={0.32} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(100,200,150,0.1)", border: "1px solid rgba(100,200,150,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#64c896" }}><Target size={18} strokeWidth={1.5} /></div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Metas custom</h3>
              </div>
              <ProBadge />
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Crea tus propias metas: dormir a tiempo, tomar agua, meditar. Cada check pide evidencia.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[{ label: "Gimnasio 45 min", done: true }, { label: "Dormir antes de las 11", done: true }, { label: "Sin azúcar", done: false }, { label: "Leer 20 min", done: false }].map(({ label, done }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, background: done ? "rgba(100,200,150,0.15)" : "transparent", border: `1px solid ${done ? "#64c896" : "#2a2a2a"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {done && <Check size={9} strokeWidth={2.5} style={{ color: "#64c896" }} />}
                  </div>
                  <span style={{ fontSize: 13, color: done ? FG : MUTED, fontFamily: "var(--font-inter, sans-serif)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Grupos privados — span 4 */}
        <BentoCard delay={0.36} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(150,100,255,0.1)", border: "1px solid rgba(150,100,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#9664ff", marginBottom: 16 }}><Shield size={18} strokeWidth={1.5} /></div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Grupos privados</h3>
            <p style={{ margin: 0, fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Solo tus amigos. Nadie más puede ver tu progreso ni unirse sin código de invitación.</p>
          </div>
        </BentoCard>

        {/* Auditoría — span 4 */}
        <BentoCard delay={0.4} gridColumn="span 4">
          <div style={{ padding: "32px" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(239,200,139,0.1)", border: "1px solid rgba(239,200,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, marginBottom: 16 }}><TrendingUp size={18} strokeWidth={1.5} /></div>
            <h3 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 600, color: FG, fontFamily: "var(--font-inter, sans-serif)" }}>Auditoría semanal</h3>
            <p style={{ margin: 0, fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.6 }}>Cada domingo el admin revisa las evidencias. Los puntos se validan o se rechazan. Cero trampa posible.</p>
          </div>
        </BentoCard>
      </div>
    </section>
  );
}

// ─── Hábitos marquee ──────────────────────────────────────────────────────────
function HabitsMarquee() {
  const habits = [
    { icon: <Flame size={18} strokeWidth={1.5} />, label: "Gimnasio", color: TERRA },
    { icon: <Target size={18} strokeWidth={1.5} />, label: "Dieta", color: "#64c896" },
    { icon: <Star size={18} strokeWidth={1.5} />, label: "Meditación", color: "#9664ff" },
    { icon: <TrendingUp size={18} strokeWidth={1.5} />, label: "Correr", color: GOLD },
    { icon: <Calendar size={18} strokeWidth={1.5} />, label: "Sueño", color: "#6496ff" },
    { icon: <Camera size={18} strokeWidth={1.5} />, label: "Evidencia foto", color: GOLD },
    { icon: <Shield size={18} strokeWidth={1.5} />, label: "Sin azúcar", color: "#64c896" },
    { icon: <Zap size={18} strokeWidth={1.5} />, label: "Lectura diaria", color: TERRA },
    { icon: <Award size={18} strokeWidth={1.5} />, label: "Reto grupal", color: "#9664ff" },
  ];
  const doubled = [...habits, ...habits];
  return (
    <section style={{ padding: "0 0 120px", overflow: "hidden" }}>
      <div style={{ marginBottom: 48, textAlign: "center", padding: "0 24px" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Hábitos</span>
        <h2 style={{ margin: "12px 0 0", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Cualquier hábito, con evidencia.</h2>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(90deg, ${BG}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: `linear-gradient(-90deg, ${BG}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <motion.div
          animate={{ x: [0, -52 * habits.length] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", gap: 12, width: "max-content", padding: "0 12px" }}>
          {doubled.map(({ icon, label, color }, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 100, padding: "12px 20px", flexShrink: 0 }}>
              <span style={{ color }}>{icon}</span>
              <span style={{ fontSize: 14, color: FG, fontFamily: "var(--font-inter, sans-serif)", whiteSpace: "nowrap" }}>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Planes ───────────────────────────────────────────────────────────────────
function Planes() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const plans = [
    { name: "Free", price: "$0", period: "", highlight: false, color: MUTED, desc: "Para empezar con tus amigos hoy.", cta: "Empezar gratis", features: ["1 grupo", "Hasta 5 miembros", "Leaderboard semanal", "Evidencia fotográfica", "Rachas y bonus", "Temporadas"] },
    { name: "Pro", price: "$99", period: "/mes", highlight: true, color: GOLD, desc: "Para grupos más serios y competitivos.", cta: "Próximamente", features: ["Hasta 5 grupos", "Hasta 10 miembros/grupo", "Todo lo de Free", "Retos grupales programados", "Metas 100% personalizables", "Wrapped anual"] },
    { name: "Elite", price: "$219", period: "/mes", highlight: false, color: "#9664ff", desc: "Para competidores de alto nivel.", cta: "Próximamente", features: ["Hasta 20 grupos", "Hasta 30 miembros/grupo", "Todo lo de Pro", "Liga entre grupos", "Títulos personalizados de campeón", "Soporte prioritario"] },
  ];
  return (
    <section id="planes" ref={ref} style={{ padding: "0 24px 120px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} style={{ marginBottom: 56 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Planes</span>
        <h2 style={{ margin: "12px 0 8px", fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>Empieza gratis. Escala cuando quieras.</h2>
        <p style={{ margin: 0, fontSize: 16, color: MUTED, fontFamily: "var(--font-inter, sans-serif)" }}>El dueño del grupo paga. Los miembros entran gratis.</p>
      </motion.div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 8 }}>
        {plans.map(({ name, price, period, highlight, color, desc, features, cta }, i) => (
          <motion.div key={name} initial={{ opacity: 0, y: 32 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.6 }}
            style={{ background: highlight ? "rgba(239,200,139,0.04)" : CARD, border: `1px solid ${highlight ? "rgba(239,200,139,0.2)" : "rgba(255,255,255,0.05)"}`, borderRadius: 24, padding: "36px 32px", display: "flex", flexDirection: "column", position: "relative", boxShadow: highlight ? "0 0 80px rgba(239,200,139,0.05)" : "none" }}>
            {highlight && <div style={{ position: "absolute", top: -14, left: 32, background: GOLD, color: "#1a1000", fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "5px 14px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-inter, sans-serif)" }}>Más popular</div>}
            <div style={{ marginBottom: 28 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-inter, sans-serif)" }}>{name}</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3, margin: "0 0 4px" }}>
                <span style={{ fontSize: 48, fontWeight: 800, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1 }}>{price}</span>
                <span style={{ fontSize: 15, color: MUTED, fontFamily: "var(--font-inter, sans-serif)" }}>{period}</span>
              </div>
              {period && <p style={{ margin: "0 0 10px", fontSize: 11, color: "#3a3a3a", fontFamily: "var(--font-inter, sans-serif)" }}>pesos mexicanos</p>}
              <p style={{ margin: 0, fontSize: 14, color: MUTED, fontFamily: "var(--font-inter, sans-serif)" }}>{desc}</p>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(239,200,139,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                    <Check size={11} strokeWidth={2.5} style={{ color: GOLD }} />
                  </div>
                  <span style={{ fontSize: 14, color: "#9c9c9d", fontFamily: "var(--font-inter, sans-serif)", lineHeight: 1.4 }}>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/login" style={{ display: "block", textAlign: "center", background: highlight ? GOLD : "rgba(255,255,255,0.06)", color: highlight ? "#1a1000" : FG, fontSize: 14, fontWeight: 600, borderRadius: 100, padding: "14px 24px", textDecoration: "none", border: highlight ? "none" : "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--font-inter, sans-serif)", transition: "opacity 0.2s, transform 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}>
              {cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <section ref={ref} style={{ padding: "0 24px 120px", maxWidth: 1100, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
        style={{ background: "rgba(239,200,139,0.04)", border: "1px solid rgba(239,200,139,0.12)", borderRadius: 28, padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 300, background: "radial-gradient(ellipse, rgba(239,200,139,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Image src="/icons/logo.png" alt="Olympo" width={64} height={64} style={{ margin: "0 auto 28px", display: "block" }} />
          <h2 style={{ margin: "0 0 18px", fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 700, color: FG, fontFamily: "var(--font-display, sans-serif)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>¿Listo para competir?</h2>
          <p style={{ margin: "0 0 44px", fontSize: 18, color: MUTED, fontFamily: "var(--font-inter, sans-serif)", maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.7 }}>Crea tu grupo, invita a tus amigos y que empiece la competencia. Completamente gratis.</p>
          <Link href="/login" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: GOLD, color: "#1a1000", fontSize: 16, fontWeight: 700, borderRadius: 100, padding: "16px 36px", textDecoration: "none", boxShadow: "0 0 60px rgba(239,200,139,0.25), 0 4px 20px rgba(0,0,0,0.3)", fontFamily: "var(--font-inter, sans-serif)", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 80px rgba(239,200,139,0.35), 0 8px 30px rgba(0,0,0,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(239,200,139,0.25), 0 4px 20px rgba(0,0,0,0.3)"; }}>
            Empezar gratis <ChevronRight size={18} strokeWidth={2.5} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "32px 24px", maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Image src="/icons/logo.png" alt="Olympo" width={18} height={18} />
        <span style={{ fontSize: 13, color: "#3a3a3a", fontFamily: "var(--font-inter, sans-serif)" }}>© 2026 Olympo. Todos los derechos reservados.</span>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {[["Privacidad", "/privacidad"], ["Términos", "/terminos"]].map(([label, href]) => (
          <Link key={href} href={href} style={{ fontSize: 13, color: "#3a3a3a", textDecoration: "none", fontFamily: "var(--font-inter, sans-serif)", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = MUTED)}
            onMouseLeave={e => (e.currentTarget.style.color = "#3a3a3a")}>{label}</Link>
        ))}
      </div>
    </footer>
  );
}

// ─── Responsive overrides ─────────────────────────────────────────────────────
const css = `
  @media (max-width: 768px) {
    [style*="grid-column: span 7"],
    [style*="grid-column: span 8"],
    [style*="grid-column: span 5"],
    [style*="grid-column: span 4"],
    [style*="grid-column: span 6"] {
      grid-column: 1 / -1!important;
    }
  }
  html { scroll-behavior: smooth; }
`;

// ─── Main ─────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <>
      <style>{css}</style>
      <div style={{ background: BG, minHeight: "100dvh", color: FG }}>
        <Navbar />
        <Hero />
        <HowItWorks />
        <BentoFeatures />
        <HabitsMarquee />
        <Planes />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
