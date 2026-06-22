"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/hooks/useProfile";

// Si el usuario no ha completado el onboarding, lo manda a /onboarding.
// Va dentro del layout privado; /onboarding vive fuera de (app) para no
// caer en un bucle de redirección.
export function OnboardingGate() {
  const router = useRouter();
  const { profile, loading } = useProfile();

  useEffect(() => {
    if (!loading && profile && !profile.onboarded) {
      // Conserva el destino actual (p. ej. una invitación) para volver tras el onboarding
      const path = window.location.pathname + window.location.search;
      const q = path && path !== "/" ? `?next=${encodeURIComponent(path)}` : "";
      router.replace(`/onboarding${q}`);
    }
  }, [loading, profile, router]);

  return null;
}
