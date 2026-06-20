"use client";

import { useState, useEffect } from "react";

export type PushState = "unsupported" | "denied" | "granted" | "default";

async function registerSubscription(groupId?: string | null): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey || !("serviceWorker" in navigator)) return false;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), group_id: groupId ?? null }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[push] subscribe failed:", res.status, body);
  }
  return res.ok;
}

export function usePushNotifications(groupId?: string | null) {
  const [state, setState] = useState<PushState>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    const perm = Notification.permission as PushState;
    setState(perm);

    // Auto-register if permission already granted (e.g. returning visit)
    if (perm === "granted") {
      registerSubscription(groupId).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe(): Promise<boolean> {
    setError(null);
    if (!("serviceWorker" in navigator)) {
      setError("Tu navegador no soporta notificaciones push.");
      return false;
    }
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      setError("VAPID no configurado. Contacta al administrador.");
      return false;
    }

    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== "granted") return false;

      const ok = await registerSubscription(groupId);
      if (!ok) { setError("Error al guardar la suscripción."); return false; }

      setState("granted");
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      setError("No se pudo activar. Revisa los permisos del navegador.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { state, loading, error, subscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
}
