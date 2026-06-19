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

  return { profile, avatarUrl, displayName, loading, uploadAvatar, refetch: fetchProfile };
}

// Comprime la imagen a máximo `maxSize` px en el lado más largo
async function compressImage(file: File, maxSize: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        },
        "image/jpeg",
        0.85
      );
    };
    img.src = url;
  });
}
