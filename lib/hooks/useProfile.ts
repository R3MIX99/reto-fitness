"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useUser } from "./useUser";
import type { Profile } from "@/types/database";

export function useProfile() {
  const { user } = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Devuelve la URL del avatar: primero la del perfil (subida por el usuario),
  // si no existe usa la de Google OAuth
  const avatarUrl =
    profile?.avatar_url ??
    user?.user_metadata?.avatar_url ??
    null;

  const displayName =
    profile?.full_name ??
    user?.user_metadata?.full_name ??
    user?.email?.split("@")[0] ??
    "Tú";

  async function uploadAvatar(file: File): Promise<string | null> {
    if (!user) return null;
    const supabase = createClient();

    // Comprimir/redimensionar en el cliente antes de subir
    const compressed = await compressImage(file, 400);
    const ext = compressed.type.split("/")[1] ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatares")
      .upload(path, compressed, { upsert: true });

    if (uploadError) return null;

    const { data: { publicUrl } } = supabase.storage
      .from("avatares")
      .getPublicUrl(path);

    // Guardar URL en profiles con cache-busting
    const urlWithBust = `${publicUrl}?t=${Date.now()}`;
    // Supabase TS generics infer update() param as never in strict mode; cast through unknown
    await supabase
      .from("profiles")
      .update({ avatar_url: urlWithBust } as unknown as never)
      .eq("id", user.id);

    setProfile((prev) => prev ? { ...prev, avatar_url: urlWithBust } : prev);
    return urlWithBust;
  }

  // Guarda los datos del onboarding y lo marca como completado
  async function completeOnboarding(data: { full_name: string; gender: string }): Promise<void> {
    if (!user) throw new Error("Sin sesión");
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name, gender: data.gender, onboarded: true } as unknown as never)
      .eq("id", user.id) as unknown as { error: { message: string } | null };
    if (error) throw new Error(error.message);
    setProfile((prev) => prev ? { ...prev, ...data, onboarded: true } : prev);
  }

  // Marca la guía interactiva como completada (o saltada)
  async function completeTour(): Promise<void> {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ tour_completed: true } as unknown as never)
      .eq("id", user.id);
    setProfile((prev) => prev ? { ...prev, tour_completed: true } : prev);
  }

  return {
    profile,
    avatarUrl,
    displayName,
    loading,
    uploadAvatar,
    completeOnboarding,
    completeTour,
    refetch: fetchProfile,
  };
}

// Archivos que ya pasaron por compressImage → tamaño (maxSize) al que se
// comprimieron. Permite comprimir UNA sola vez (al elegir/tomar la foto) y que
// las llamadas posteriores (prepareEvidence) retornen al instante sin volver a
// decodificar. Si se pide un tamaño MENOR (p. ej. avatar 400), sí recomprime.
const precompressed = new WeakMap<File, number>();

// Lee las dimensiones sin decodificar la imagen completa: el navegador conoce
// naturalWidth/Height con solo parsear los headers (el decode ocurre al pintar,
// y este <img> nunca se pinta).
function readImageDimensions(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    const done = (d: { w: number; h: number } | null) => {
      URL.revokeObjectURL(url);
      img.src = "";
      resolve(d);
    };
    img.onload = () => done({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => done(null);
    img.src = url;
  });
}

// Comprime la imagen a máximo `maxSize` px en el lado más largo
export async function compressImage(file: File, maxSize: number): Promise<File> {
  // Solo comprimimos imágenes; cualquier otra cosa (o un archivo raro) se
  // devuelve tal cual para no romper el flujo.
  if (!file.type.startsWith("image/")) return file;
  // Ya comprimida a este tamaño (o menor) en un paso anterior → no repetir.
  const prevSize = precompressed.get(file);
  if (prevSize !== undefined && prevSize <= maxSize) return file;

  // Vía preferida: createImageBitmap CON resize integrado. Al pasar
  // resizeWidth/resizeHeight, el downscale ocurre DURANTE la decodificación:
  // el navegador nunca materializa el bitmap completo (una foto de cámara de
  // 12-108MP son 50-400MB en RGBA — el pico que mataba la app en teléfonos
  // con poca memoria). El resultado ocupa ~8MB máximo.
  if (typeof createImageBitmap === "function") {
    try {
      const dims = await readImageDimensions(file);
      if (dims) {
        const ratio = Math.min(maxSize / dims.w, maxSize / dims.h, 1);
        const w = Math.max(1, Math.round(dims.w * ratio));
        const h = Math.max(1, Math.round(dims.h * ratio));
        const bitmap = await createImageBitmap(file, {
          resizeWidth: w,
          resizeHeight: h,
          resizeQuality: "medium",
        });
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { bitmap.close(); return file; }
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close(); // libera el bitmap YA (no espera al GC)
        const blob = await new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/jpeg", 0.85)
        );
        canvas.width = 0; // libera el buffer del canvas
        canvas.height = 0;
        if (blob) {
          const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
          precompressed.set(out, maxSize);
          return out;
        }
        return file;
      }
    } catch {
      // Si falla (p. ej. sin memoria), caemos al método clásico o al original.
    }
  }

  // Fallback clásico con <img>, ahora con onerror (evita promesas colgadas) y
  // liberación explícita de recursos.
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    const cleanup = () => { URL.revokeObjectURL(url); img.src = ""; };
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) { cleanup(); resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            const out = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
            precompressed.set(out, maxSize);
            resolve(out);
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => { cleanup(); resolve(file); };
    img.src = url;
  });
}
