"use client";

import { useEffect, useState } from "react";

// Detecta si la app corre dentro de un wrapper nativo de tienda:
// - Capacitor (iOS/Android nativo) → window.Capacitor.isNativePlatform()
// - TWA (Android / Google Play) → la navegación inicial trae referrer
//   "android-app://"; lo persistimos porque en navegaciones posteriores se pierde.
// Sirve para ocultar el flujo de compra con Stripe dentro de las apps de tienda
// (Apple/Google exigen su propio billing). En web/PWA devuelve false → Stripe ok.
export function detectNativeApp(): boolean {
  if (typeof window === "undefined") return false;

  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;

  try {
    if (document.referrer.startsWith("android-app://")) {
      sessionStorage.setItem("olympo_twa", "1");
    }
    if (sessionStorage.getItem("olympo_twa") === "1") return true;
  } catch {
    /* sessionStorage puede no estar disponible; ignorar */
  }
  return false;
}

// Hook seguro para SSR: empieza en false (web) y se resuelve tras montar,
// evitando desajustes de hidratación.
export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(detectNativeApp());
  }, []);
  return native;
}
