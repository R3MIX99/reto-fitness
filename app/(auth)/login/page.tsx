"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          cancel: () => void;
        };
      };
    };
    __gsiCallback?: (r: { credential: string }) => void;
  }
}

// ── Inner component (needs useSearchParams → must be inside Suspense) ──────

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gsiReady, setGsiReady] = useState(false);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const next = searchParams.get("next");

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Configuración de Google no encontrada.");
      return;
    }

    // Callback que GSI llama con el ID token tras elegir cuenta.
    window.__gsiCallback = async ({ credential }: { credential: string }) => {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credential,
      });
      if (authErr) {
        setError("No se pudo iniciar sesión. Intenta de nuevo.");
        setLoading(false);
      } else {
        const destination =
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : "/grupo";
        router.push(destination);
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: "__gsiCallback",
        use_fedcm_for_prompt: true,
        itp_support: true,
      });
      setGsiReady(true);

      // Botón de reserva: se renderiza invisible; se activa si prompt() no muestra nada.
      if (fallbackRef.current) {
        window.google?.accounts.id.renderButton(fallbackRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          width: fallbackRef.current.offsetWidth || 320,
          text: "signin_with",
          locale: "es_419",
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      window.google?.accounts.id.cancel();
      delete window.__gsiCallback;
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, [next, router]);

  // Intenta mostrar el popup/One-Tap de Google; si no está disponible (bloqueado
  // por el navegador) muestra el botón estándar de Google como fallback.
  function handleClick() {
    if (!gsiReady || !window.google) return;
    setError(null);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // One-Tap bloqueado → mostrar botón estándar de Google
        if (fallbackRef.current) {
          fallbackRef.current.style.display = "block";
          fallbackRef.current.querySelector("div")?.dispatchEvent(new MouseEvent("click"));
        }
      }
    });
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Glow decorativo */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] -translate-y-1/3"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(238,229,233,0.18) 0%, rgba(238,229,233,0.06) 50%, rgba(0,0,0,0) 75%)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-sm space-y-10">
        {/* Logo / nombre */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-accent mb-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EEE5E9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 6.5a6 6 0 1 0 8.49 8.49" />
              <path d="M17.5 3.5 12 9l-2-2" />
              <path d="m19 9-2 2" />
              <path d="M3 21l4-4" />
            </svg>
          </div>
          <h1 className="font-display font-semibold text-[32px] text-[var(--color-fg)] leading-none">
            Olympo
          </h1>
          <p className="text-[var(--color-muted)] text-sm">
            Compite con tus amigos. El más constante gana.
          </p>
        </div>

        {/* Botón de inicio de sesión */}
        <div className="space-y-3">
          <button
            onClick={handleClick}
            disabled={loading || !gsiReady}
            className="w-full flex items-center justify-center gap-3 bg-[var(--color-bg-card)] rounded-pill px-5 py-3.5 text-[var(--color-fg)] text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--color-border)" }}
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-[var(--color-muted)] border-t-[var(--color-fg)] animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Iniciando sesión..." : "Continuar con Google"}
          </button>

          {/* Botón estándar de Google (fallback si One-Tap es bloqueado por el navegador) */}
          <div ref={fallbackRef} className="w-full" style={{ display: "none" }} />

          {error && (
            <p className="text-center text-xs text-accent">{error}</p>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--color-muted)]">
          Al continuar aceptas los términos del reto.<br />
          Solo tú y tus amigos ven tus datos.
        </p>
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
