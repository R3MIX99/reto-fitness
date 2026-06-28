"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Mail, ArrowRight } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (cb?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
  }
}

type Step = "landing" | "email" | "otp";

// ── CSS animations ─────────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes loginFadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes loginStepIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes otpPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.12); }
  100% { transform: scale(1); }
}
.login-fade-up   { animation: loginFadeUp  0.45s cubic-bezier(.22,.68,0,1.2) both; }
.login-step-in   { animation: loginStepIn  0.3s  cubic-bezier(.22,.68,0,1.2) both; }
.otp-pop         { animation: otpPop       0.22s cubic-bezier(.22,.68,0,1.2); }
`;

function ensureAnimCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("login-anim-css")) return;
  const s = document.createElement("style");
  s.id = "login-anim-css";
  s.textContent = ANIM_CSS;
  document.head.appendChild(s);
}

// ── Inner component ────────────────────────────────────────────────────────

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [step, setStep]           = useState<Step>("landing");
  const [email, setEmail]         = useState("");
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [popIdx, setPopIdx]       = useState<number | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [gsiReady, setGsiReady]   = useState(false);
  const [resendSec, setResendSec] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const fallbackRef = useRef<HTMLDivElement>(null);
  const emailRef    = useRef<HTMLInputElement>(null);
  const otpRefs     = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { ensureAnimCSS(); }, []);

  // ── Google GSI setup ──────────────────────────────────────────────────────

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const handleCredential = async ({ credential }: { credential: string }) => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential });
      if (authErr) {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        setLoading(false);
      } else {
        redirect();
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        use_fedcm_for_prompt: true,
        itp_support: true,
      });
      setGsiReady(true);
      if (fallbackRef.current) {
        window.google?.accounts.id.renderButton(fallbackRef.current, {
          theme: "filled_black", size: "large", shape: "pill",
          width: fallbackRef.current.offsetWidth || 320,
          text: "signin_with", locale: "es_419",
        });
      }
    };
    document.head.appendChild(script);
    return () => { window.google?.accounts.id.cancel(); document.head.contains(script) && document.head.removeChild(script); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function redirect() {
    const validNext = next && next.startsWith("/") && !next.startsWith("//") &&
      !next.startsWith("/perfil") && !next.startsWith("/dashboard") && !next.startsWith("/login");
    router.replace(validNext ? next : "/dashboard");
  }

  function handleGoogleClick() {
    if (!gsiReady || !window.google) return;
    setError(null);
    window.google.accounts.id.prompt((n) => {
      if (n.isNotDisplayed() || n.isSkippedMoment()) {
        if (fallbackRef.current) {
          fallbackRef.current.style.display = "block";
          fallbackRef.current.querySelector("div")?.dispatchEvent(new MouseEvent("click"));
        }
      }
    });
  }

  // ── Step transition ───────────────────────────────────────────────────────

  function goTo(s: Step) {
    setTransitioning(true);
    setError(null);
    setTimeout(() => { setStep(s); setTransitioning(false); }, 220);
  }

  // ── Email OTP ─────────────────────────────────────────────────────────────

  async function handleSendOtp() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) { setError("Escribe un correo válido."); return; }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
    setLoading(false);
    if (err) {
      setError("No se pudo enviar el código. Intenta de nuevo.");
    } else {
      setOtp(["", "", "", "", "", ""]);
      goTo("otp");
      startResendTimer();
      setTimeout(() => otpRefs.current[0]?.focus(), 320);
    }
  }

  function startResendTimer() {
    setResendSec(30);
    const iv = setInterval(() => setResendSec(prev => { if (prev <= 1) { clearInterval(iv); return 0; } return prev - 1; }), 1000);
  }

  async function verifyCode(code: string) {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    setLoading(false);
    if (err) {
      setError("Código incorrecto o expirado.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } else {
      redirect();
    }
  }

  // ── OTP input handlers ────────────────────────────────────────────────────

  function handleOtpChange(i: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    setError(null);

    if (digit) {
      // Pop animation
      setPopIdx(i);
      setTimeout(() => setPopIdx(null), 220);
      // Advance
      if (i < 5) setTimeout(() => otpRefs.current[i + 1]?.focus(), 0);
    }

    if (next.every(d => d) && digit) verifyCode(next.join(""));
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    const next = ["", "", "", "", "", ""];
    for (let j = 0; j < digits.length; j++) next[j] = digits[j];
    setOtp(next);
    const lastFilled = Math.min(digits.length - 1, 5);
    otpRefs.current[lastFilled]?.focus();
    if (digits.length === 6) verifyCode(digits);
  }

  // Auto-focus email when transitioning to email step
  useEffect(() => {
    if (step === "email") setTimeout(() => emailRef.current?.focus(), 320);
  }, [step]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-8 relative overflow-hidden">

      {/* Glow decorativo */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] -translate-y-1/3"
        style={{ background: "radial-gradient(ellipse at center, rgba(238,229,233,0.16) 0%, rgba(238,229,233,0.04) 55%, transparent 75%)" }}
        aria-hidden
      />

      <div
        className="relative w-full max-w-sm"
        style={{
          opacity: transitioning ? 0 : 1,
          transform: transitioning ? "translateY(10px)" : "translateY(0)",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
      >

        {/* Back button */}
        {step !== "landing" && (
          <button
            onClick={() => goTo(step === "otp" ? "email" : "landing")}
            className="absolute -top-2 left-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-surface, #1a1a1a)" }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
        )}

        {/* Logo + heading */}
        <div className="text-center mb-10 login-fade-up">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/icons/logo.png" alt="Olympo" width={72} height={72} priority />
          </div>
          <h1 className="font-display font-semibold text-[30px] text-[var(--color-fg)] leading-none">Olympo</h1>
          <p className="text-[var(--color-muted)] text-[14px] mt-2">
            {step === "landing" && "Compite con tus amigos. El más constante gana."}
            {step === "email"   && "Escribe tu correo para recibir el código."}
            {step === "otp"     && (
              <span>Código enviado a <span className="text-[var(--color-fg)]">{email}</span></span>
            )}
          </p>
        </div>

        {/* ── LANDING ── */}
        {step === "landing" && (
          <div className="space-y-3 login-step-in">
            {/* Google */}
            <button
              onClick={handleGoogleClick}
              disabled={loading || !gsiReady}
              className="w-full flex items-center justify-center gap-3 rounded-pill px-5 py-3.5 text-[var(--color-fg)] text-[14px] font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-[var(--color-muted)] border-t-[var(--color-fg)] animate-spin" />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? "Iniciando sesión…" : "Continuar con Google"}
            </button>

            <div ref={fallbackRef} className="w-full" style={{ display: "none" }} />

            {/* Divider */}
            <div className="flex items-center gap-3 py-0.5">
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
              <span className="text-[11px] text-[var(--color-muted)]">o</span>
              <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
            </div>

            {/* Email */}
            <button
              onClick={() => goTo("email")}
              className="w-full flex items-center justify-center gap-3 rounded-pill px-5 py-3.5 text-[var(--color-fg)] text-[14px] font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            >
              <Mail size={16} strokeWidth={1.5} />
              Continuar con Email
            </button>

            {error && <p className="text-center text-[12px] text-accent">{error}</p>}

            <p className="text-center text-[11px] text-[var(--color-muted)] pt-4">
              Al continuar aceptas los términos del reto.<br />
              Solo tú y tus amigos ven tus datos.
            </p>
          </div>
        )}

        {/* ── EMAIL ── */}
        {step === "email" && (
          <div className="space-y-4 login-step-in">
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              autoComplete="email"
              onChange={e => { setEmail(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleSendOtp()}
              className="w-full rounded-[14px] px-4 py-4 text-[16px] text-[var(--color-fg)] outline-none border transition-colors"
              style={{
                background: "var(--color-bg-card)",
                borderColor: error ? "var(--color-accent)" : "var(--color-border)",
              }}
            />
            {error && <p className="text-[12px] text-accent">{error}</p>}
            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-pill px-5 py-3.5 text-[14px] font-semibold transition-opacity disabled:opacity-40"
              style={{ background: "var(--color-fg)", color: "var(--color-bg)" }}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-[var(--color-bg)] border-t-transparent animate-spin" />
              ) : (
                <> Enviar código <ArrowRight size={15} strokeWidth={2.5} /> </>
              )}
            </button>
          </div>
        )}

        {/* ── OTP ── */}
        {step === "otp" && (
          <div className="space-y-8 login-step-in">
            {/* 6 boxes */}
            <div className="flex gap-2 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={2}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  onPaste={handleOtpPaste}
                  disabled={loading}
                  className={popIdx === i ? "otp-pop" : ""}
                  style={{
                    width: 46,
                    height: 58,
                    textAlign: "center",
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "var(--font-display, monospace)",
                    background: "var(--color-bg-card)",
                    color: "var(--color-fg)",
                    border: `2px solid ${error ? "var(--color-accent)" : digit ? "var(--color-warm)" : "var(--color-border)"}`,
                    borderRadius: 12,
                    outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    boxShadow: digit && !error ? "0 0 0 1px rgba(239,200,139,0.25)" : "none",
                    caretColor: "transparent",
                    opacity: loading ? 0.5 : 1,
                  }}
                />
              ))}
            </div>

            {/* Spinner de verificación */}
            {loading && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-muted)] border-t-[var(--color-fg)] animate-spin" />
                <p className="text-[12px] text-[var(--color-muted)]">Verificando…</p>
              </div>
            )}

            {error && (
              <p className="text-center text-[12px] text-accent">{error}</p>
            )}

            {/* Reenviar */}
            <p className="text-center text-[12px] text-[var(--color-muted)]">
              {resendSec > 0 ? (
                `Puedes reenviar en ${resendSec}s`
              ) : (
                <button
                  onClick={handleSendOtp}
                  className="underline underline-offset-2 transition-colors hover:text-[var(--color-fg)]"
                  disabled={loading}
                >
                  Reenviar código
                </button>
              )}
            </p>
          </div>
        )}

      </div>
    </main>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
