"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { del } from "idb-keyval";
import type { User } from "@supabase/supabase-js";

// Estado de sesión compartido por TODA la app. Antes cada componente que usaba
// useUser() hacía su propio auth.getUser() (una petición de red por componente,
// ~55 en total) y las consultas esperaban a que terminaran. Ahora se lee la
// sesión guardada en el dispositivo UNA sola vez (sin red, salvo para renovar
// un token vencido) y se comparte. La autorización real sigue en el servidor:
// RLS en la base de datos y getUser() en las rutas de API.

interface SessionState {
  user: User | null;
  loading: boolean;
}

let state: SessionState = { user: null, loading: true };
const listeners = new Set<(s: SessionState) => void>();
let started = false;

function publish(user: User | null) {
  // Conserva la misma referencia si es el mismo usuario sin cambios (p. ej. al
  // renovar el token): evita que los efectos que dependen de `user` se repitan.
  const prev = state.user;
  const sameUser = !!prev && !!user && prev.id === user.id && prev.updated_at === user.updated_at;
  state = { user: sameUser ? prev : user, loading: false };
  listeners.forEach((l) => l(state));
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const supabase = createClient();
  supabase.auth.getSession().then(({ data }) => publish(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((_event, session) => publish(session?.user ?? null));
}

export function useUser() {
  const [snapshot, setSnapshot] = useState<SessionState>(state);

  useEffect(() => {
    start();
    listeners.add(setSnapshot);
    setSnapshot(state); // por si cambió entre el render y el efecto
    return () => { listeners.delete(setSnapshot); };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // La caché persistida pertenece al usuario anterior: se borra para que el
    // siguiente inicio de sesión en este dispositivo no vea datos ajenos.
    try { await del("olympo-query-cache"); } catch { /* no-op */ }
  }

  return { user: snapshot.user, loading: snapshot.loading, signOut };
}
