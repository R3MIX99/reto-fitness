"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Zap, Users, Camera, Calendar, ChevronRight, Check, Menu, X, Flame } from "lucide-react";

// ── Animaciones ───────────────────────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.7s cubic-bezier(0.32,0.72,0,1) ${delay}ms, transform 0.7s cubic-bezier(0.32,0.72,0,1) ${delay}ms`,
    }}>{children}</div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      <nav style={{
        position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, width: "calc(100% - 32px)", maxWidth: 900,
        background: scrolled ? "rgba(4,5,6,0.92)" : "rgba(4,5,6,0.7)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 100,
        padding: "10px 16px 10px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "background 0.3s ease",
        boxShadow: "rgba(0,0,0,0.4) 0px 4px 40px 8px",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <Image src="/icons/logo.png" alt="Olympo" width={28} height={28} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#EEE5E9", letterSpacing: "0.05em", fontFamily: "var(--font-clash, sans-serif)" }}>OLYMPO</span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex" style={{ gap: 32, alignItems: "center" }}>
          {[["#como-funciona", "Cómo funciona"], ["#planes", "Planes"]].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 14, color: "#9c9c9d", textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#9c9c9d")}>{label}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{
            display: "none", fontSize: 13, color: "#9c9c9d", textDecoration: "none",
            padding: "6px 14px",
          }} className="hidden md:block">Iniciar sesión</Link>
          <Link href="/login" style={{
            fontSize: 13, fontWeight: 600, color: "#1a1000",
            background: "#EFC88B", borderRadius: 100,
            padding: "8px 18px", textDecoration: "none",
            transition: "opacity 0.2s",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
            Entrar
          </Link>
          <button onClick={() => setOpen(o => !o)} className="md:hidden"
            style={{ background: "transparent", border: "none", color: "#9c9c9d", cursor: "pointer", padding: 4 }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99,
          background: "rgba(4,5,6,0.97)", backdropFilter: "blur(20px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40,
        }}>
          <button onClick={() => setOpen(false)} style={{ position: "absolute", top: 28, right: 28, background: "transparent", border: "none", color: "#9c9c9d", cursor: "pointer" }}>
            <X size={24} />
          </button>
          {[["#como-funciona", "Cómo funciona"], ["#planes", "Planes"]].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}
              style={{ fontSize: 28, fontWeight: 700, color: "#EEE5E9", textDecoration: "none", fontFamily: "var(--font-clash, sans-serif)" }}>{label}</a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}
            style={{ fontSize: 16, fontWeight: 600, color: "#1a1000", background: "#EFC88B", borderRadius: 100, padding: "14px 40px", textDecoration: "none" }}>
            Entrar a la app
          </Link>
        </div>
      )}
    </>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "120px 24px 80px", position: "relative", overflow: "hidden",
    }}>
      {/* Radial glow */}
      <div aria-hidden style={{
        position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
        width: 700, height: 700, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(ellipse at center, rgba(239,200,139,0.12) 0%, rgba(207,92,54,0.05) 40%, transparent 70%)",
      }} />
      <div aria-hidden style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 500, height: 300,
        background: "radial-gradient(84.6% 73.49% at 50% 26.51%, rgba(4,63,150,0.15), rgba(6,18,37,0.05))",
        pointerEvents: "none",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.2)",
        borderRadius: 100, padding: "5px 14px 5px 10px", marginBottom: 32,
        animation: "fadeUp 0.8s cubic-bezier(0.32,0.72,0,1) both",
      }}>
        <Flame size={12} style={{ color: "#EFC88B" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#EFC88B", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Competencia entre amigos
        </span>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: "var(--font-clash, sans-serif)",
        fontSize: "clamp(48px, 9vw, 88px)",
        fontWeight: 700, color: "#EEE5E9",
        lineHeight: 1.0, letterSpacing: "-0.03em",
        textAlign: "center", maxWidth: 800,
        margin: "0 0 24px",
        animation: "fadeUp 0.9s cubic-bezier(0.32,0.72,0,1) 80ms both",
      }}>
        El más constante{" "}
        <span style={{
          background: "linear-gradient(135deg, #EFC88B 0%, #CF5C36 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>gana.</span>
      </h1>

      {/* Sub */}
      <p style={{
        fontSize: "clamp(16px, 2.5vw, 20px)", color: "#6a6b6c",
        lineHeight: 1.6, textAlign: "center", maxWidth: 520,
        margin: "0 0 48px",
        animation: "fadeUp 0.9s cubic-bezier(0.32,0.72,0,1) 160ms both",
      }}>
        Crea un grupo con tus amigos, registra tus entrenamientos con evidencia fotográfica y compite semana a semana por el título de campeón.
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
        animation: "fadeUp 0.9s cubic-bezier(0.32,0.72,0,1) 240ms both",
      }}>
        <Link href="/login" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#EFC88B", color: "#1a1000",
          fontSize: 15, fontWeight: 700, borderRadius: 100,
          padding: "14px 28px", textDecoration: "none",
          boxShadow: "0 0 40px rgba(239,200,139,0.2)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(239,200,139,0.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(239,200,139,0.2)"; }}>
          Empezar gratis
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={13} strokeWidth={2.5} />
          </div>
        </Link>
        <a href="#como-funciona" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 15, fontWeight: 500, color: "#9c9c9d",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 100,
          padding: "14px 28px", textDecoration: "none",
          transition: "color 0.2s, border-color 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "#EEE5E9"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#9c9c9d"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
          Ver cómo funciona
        </a>
      </div>

      {/* App mockup hint */}
      <div style={{
        marginTop: 80, width: "100%", maxWidth: 360,
        background: "rgba(16,16,16,0.8)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 24, overflow: "hidden",
        boxShadow: "rgba(0,0,0,0.4) 0px 20px 60px, rgba(239,200,139,0.05) 0px 0px 40px",
        animation: "fadeUp 1s cubic-bezier(0.32,0.72,0,1) 400ms both",
      }}>
        {/* Leaderboard mock */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <p style={{ margin: 0, fontSize: 11, color: "#5a5a5a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Semana actual — Grupo Spartan</p>
        </div>
        {[
          { pos: 1, name: "Carlos M.", pts: 89, color: "#EFC88B" },
          { pos: 2, name: "André S.", pts: 81, color: "#9c9c9d" },
          { pos: 3, name: "Rodrigo P.", pts: 74, color: "#CD7F32" },
        ].map(({ pos, name, pts, color }) => (
          <div key={pos} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color, width: 20, textAlign: "center" }}>{pos}</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a1a1a", border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#EEE5E9" }}>{name[0]}</span>
            </div>
            <span style={{ flex: 1, fontSize: 14, color: "#EEE5E9" }}>{name}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color }}>{pts} pts</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: "13", label: "pts máx por día", suffix: "" },
    { value: "7", label: "días de competencia", suffix: "" },
    { value: "100%", label: "con evidencia fotográfica", suffix: "" },
  ];
  return (
    <FadeUp>
      <div style={{
        display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1px",
        background: "rgba(255,255,255,0.05)", borderRadius: 20, overflow: "hidden",
        maxWidth: 700, margin: "0 auto 120px",
      }}>
        {stats.map(({ value, label }) => (
          <div key={label} style={{
            flex: "1 1 180px", padding: "32px 24px", textAlign: "center",
            background: "#040506",
          }}>
            <p style={{ margin: "0 0 6px", fontSize: 40, fontWeight: 800, color: "#EFC88B", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em" }}>{value}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#6a6b6c" }}>{label}</p>
          </div>
        ))}
      </div>
    </FadeUp>
  );
}

// ── Cómo funciona ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: "01", title: "Crea o únete a un grupo", desc: "Invita a tus amigos con un código. Cada grupo compite de forma privada — solo ven sus datos quienes están dentro." },
    { num: "02", title: "Registra tus hábitos diarios", desc: "Gimnasio, dieta y metas personalizadas. Cada check requiere foto de evidencia. Sin trampa." },
    { num: "03", title: "El marcador en tiempo real", desc: "El leaderboard se actualiza con cada check. Al final de la temporada, el más constante se lleva el título de campeón." },
  ];
  return (
    <section id="como-funciona" style={{ padding: "0 24px 120px", maxWidth: 900, margin: "0 auto" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#EFC88B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Cómo funciona</span>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, color: "#EEE5E9", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Simple. Honesto. Competitivo.
          </h2>
        </div>
      </FadeUp>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {steps.map(({ num, title, desc }, i) => (
          <FadeUp key={num} delay={i * 100}>
            <div style={{
              display: "flex", gap: 28, padding: "32px 28px",
              background: "#07080a", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 16,
              transition: "border-color 0.3s",
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(239,200,139,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#2a2a2a", fontFamily: "var(--font-clash, sans-serif)", flexShrink: 0, paddingTop: 2 }}>{num}</span>
              <div>
                <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600, color: "#EEE5E9" }}>{title}</h3>
                <p style={{ margin: 0, fontSize: 15, color: "#6a6b6c", lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const items = [
    { icon: <Trophy size={20} strokeWidth={1.5} />, title: "Leaderboard semanal", desc: "Ranking en tiempo real. Todos ven quién está arriba y quién se está quedando atrás.", span: 2 },
    { icon: <Camera size={20} strokeWidth={1.5} />, title: "Evidencia fotográfica", desc: "Cada check requiere foto. Sin foto, no hay puntos. Sin trampa.", span: 1 },
    { icon: <Zap size={20} strokeWidth={1.5} />, title: "Rachas y bonus", desc: "3 días perfectos consecutivos = +3 pts bonus. La constancia tiene recompensa extra.", span: 1 },
    { icon: <Calendar size={20} strokeWidth={1.5} />, title: "Temporadas", desc: "Compite por temporadas. Cada una tiene su campeón y su historial.", span: 1 },
    { icon: <Users size={20} strokeWidth={1.5} />, title: "Grupos privados", desc: "Solo tus amigos. Nadie más ve tus datos ni tu progreso.", span: 1 },
    { icon: <Flame size={20} strokeWidth={1.5} />, title: "Títulos de campeón", desc: "El ganador de cada temporada recibe un título visible en su perfil.", span: 2 },
  ];
  return (
    <section style={{ padding: "0 24px 120px", maxWidth: 900, margin: "0 auto" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#EFC88B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Features</span>
          <h2 style={{ margin: "12px 0 0", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, color: "#EEE5E9", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Todo lo que necesitas para ganar.
          </h2>
        </div>
      </FadeUp>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
        {items.map(({ icon, title, desc, span }, i) => (
          <FadeUp key={title} delay={i * 60} className={span === 2 ? "col-span-2" : ""} style={{ gridColumn: span === 2 ? "1 / -1" : undefined } as React.CSSProperties}>
            <div style={{
              padding: "28px 28px",
              background: "#07080a", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 16, height: "100%",
              transition: "border-color 0.3s, background 0.3s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,200,139,0.12)"; e.currentTarget.style.background = "#0a0b0c"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.background = "#07080a"; }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(239,200,139,0.08)", border: "1px solid rgba(239,200,139,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#EFC88B", marginBottom: 16 }}>
                {icon}
              </div>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#EEE5E9" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#6a6b6c", lineHeight: 1.6 }}>{desc}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// ── Planes ────────────────────────────────────────────────────────────────────
function Planes() {
  const plans = [
    {
      name: "Free", price: "$0", period: "", highlight: false,
      desc: "Para empezar con tus amigos.",
      features: ["1 grupo", "Hasta 5 miembros", "Leaderboard y rachas", "Evidencia fotográfica", "Temporadas"],
    },
    {
      name: "Pro", price: "$5.99", period: "/mes", highlight: true,
      desc: "Para grupos más serios.",
      features: ["Hasta 5 grupos", "Hasta 10 miembros por grupo", "Todo lo de Free", "Retos grupales programados", "Metas personalizables", "Wrapped anual"],
    },
    {
      name: "Elite", price: "$12.99", period: "/mes", highlight: false,
      desc: "Para competidores de alto nivel.",
      features: ["Hasta 20 grupos", "Hasta 30 miembros por grupo", "Todo lo de Pro", "Liga entre grupos", "Títulos personalizados", "Soporte prioritario"],
    },
  ];
  return (
    <section id="planes" style={{ padding: "0 24px 120px", maxWidth: 960, margin: "0 auto" }}>
      <FadeUp>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#EFC88B", letterSpacing: "0.12em", textTransform: "uppercase" }}>Planes</span>
          <h2 style={{ margin: "12px 0 8px", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, color: "#EEE5E9", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
            Empieza gratis. Escala cuando quieras.
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: "#6a6b6c" }}>El dueño del grupo paga. Los miembros entran gratis.</p>
        </div>
      </FadeUp>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        {plans.map(({ name, price, period, highlight, desc, features }, i) => (
          <FadeUp key={name} delay={i * 80}>
            <div style={{
              padding: "32px 28px",
              background: highlight ? "rgba(239,200,139,0.06)" : "#07080a",
              border: `1px solid ${highlight ? "rgba(239,200,139,0.25)" : "rgba(255,255,255,0.05)"}`,
              borderRadius: 20, height: "100%", display: "flex", flexDirection: "column",
              boxShadow: highlight ? "0 0 60px rgba(239,200,139,0.06)" : "none",
              position: "relative",
            }}>
              {highlight && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "#EFC88B", color: "#1a1000", fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "4px 12px", letterSpacing: "0.08em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  Más popular
                </div>
              )}
              <div style={{ marginBottom: 24 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: highlight ? "#EFC88B" : "#6a6b6c", textTransform: "uppercase", letterSpacing: "0.08em" }}>{name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 2, margin: "0 0 8px" }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: "#EEE5E9", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em" }}>{price}</span>
                  <span style={{ fontSize: 14, color: "#6a6b6c" }}>{period}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "#6a6b6c" }}>{desc}</p>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(239,200,139,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Check size={10} strokeWidth={2.5} style={{ color: "#EFC88B" }} />
                    </div>
                    <span style={{ fontSize: 14, color: "#9c9c9d" }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/login" style={{
                display: "block", textAlign: "center",
                background: highlight ? "#EFC88B" : "rgba(255,255,255,0.06)",
                color: highlight ? "#1a1000" : "#EEE5E9",
                fontSize: 14, fontWeight: 600, borderRadius: 100,
                padding: "12px 24px", textDecoration: "none",
                border: highlight ? "none" : "1px solid rgba(255,255,255,0.08)",
                transition: "opacity 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {name === "Free" ? "Empezar gratis" : "Próximamente"}
              </Link>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}

// ── CTA Final ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <FadeUp>
      <section style={{ padding: "0 24px 120px", maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          background: "rgba(239,200,139,0.05)", border: "1px solid rgba(239,200,139,0.12)",
          borderRadius: 28, padding: "64px 40px",
          boxShadow: "0 0 80px rgba(239,200,139,0.04)",
        }}>
          <Image src="/icons/logo.png" alt="Olympo" width={56} height={56} style={{ margin: "0 auto 24px", display: "block" }} />
          <h2 style={{ margin: "0 0 16px", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, color: "#EEE5E9", fontFamily: "var(--font-clash, sans-serif)", letterSpacing: "-0.02em" }}>
            ¿Listo para competir?
          </h2>
          <p style={{ margin: "0 0 36px", fontSize: 16, color: "#6a6b6c", lineHeight: 1.6 }}>
            Crea tu grupo, invita a tus amigos y que empiece la competencia. Es gratis.
          </p>
          <Link href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#EFC88B", color: "#1a1000",
            fontSize: 15, fontWeight: 700, borderRadius: 100,
            padding: "14px 32px", textDecoration: "none",
            boxShadow: "0 0 40px rgba(239,200,139,0.2)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(239,200,139,0.3)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(239,200,139,0.2)"; }}>
            Empezar gratis
            <ChevronRight size={16} strokeWidth={2.5} />
          </Link>
        </div>
      </section>
    </FadeUp>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.05)",
      padding: "32px 24px", display: "flex", flexWrap: "wrap",
      alignItems: "center", justifyContent: "space-between", gap: 16,
      maxWidth: 900, margin: "0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Image src="/icons/logo.png" alt="Olympo" width={20} height={20} />
        <span style={{ fontSize: 13, color: "#5a5a5a" }}>© 2026 Olympo. Todos los derechos reservados.</span>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {[["Privacidad", "/privacidad"], ["Términos", "/terminos"]].map(([label, href]) => (
          <Link key={href} href={href} style={{ fontSize: 13, color: "#5a5a5a", textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#9c9c9d")}
            onMouseLeave={e => (e.currentTarget.style.color = "#5a5a5a")}>{label}</Link>
        ))}
      </div>
    </footer>
  );
}

// ── CSS global ────────────────────────────────────────────────────────────────
const globalCSS = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .col-span-2 { grid-column: 1 / -1; }
  html { scroll-behavior: smooth; }
`;

// ── Main ──────────────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <>
      <style>{globalCSS}</style>
      <div style={{ background: "#040506", minHeight: "100dvh", color: "#EEE5E9" }}>
        <Navbar />
        <Hero />
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <Stats />
        </div>
        <HowItWorks />
        <Features />
        <Planes />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
