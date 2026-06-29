"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";

export const PENDING_INVITE_KEY = "olympo_pending_invite";

function UnirseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (loading) return;
    if (!code) { router.replace("/grupo"); return; }

    // Persiste el código a través de todo el flujo de nuevo usuario
    if (typeof window !== "undefined") {
      localStorage.setItem(PENDING_INVITE_KEY, code);
    }

    if (!profile?.onboarded) {
      // Onboarding primero — al terminar irá al dashboard donde arranca el tour
      router.replace("/onboarding");
      return;
    }

    if (!profile?.tour_completed) {
      // Tour pendiente — el código queda en localStorage, el tour lo recuperará al terminar
      router.replace("/dashboard");
      return;
    }

    // Usuario completamente configurado → unirse directo
    if (typeof window !== "undefined") {
      localStorage.removeItem(PENDING_INVITE_KEY);
    }
    router.replace(`/grupo/unirse?code=${code}`);
  }, [profile, loading, code, router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-warm)" }} />
    </div>
  );
}

export default function UnirsePage() {
  return (
    <Suspense fallback={null}>
      <UnirseInner />
    </Suspense>
  );
}
