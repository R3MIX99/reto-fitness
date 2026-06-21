"use client";

import Image from "next/image";
import { Camera } from "lucide-react";
import { useRef, useState } from "react";

interface AvatarUploadProps {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
  onUpload: (file: File) => Promise<string | null>;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function AvatarUpload({ avatarUrl, displayName, size = 74, onUpload }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vista previa inmediata
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    const result = await onUpload(file);
    setUploading(false);

    if (!result) {
      setPreview(null); // Revertir si falla
    } else {
      URL.revokeObjectURL(objectUrl);
      setPreview(null); // Usar la URL de Supabase que ya está en el estado del hook
    }
  }

  const currentUrl = preview ?? avatarUrl;
  const badgeSize = Math.round(size * 0.35);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {currentUrl ? (
        <Image
          src={currentUrl}
          alt={displayName}
          width={size}
          height={size}
          className="rounded-full border-2 border-[var(--color-border)] object-cover"
          style={{ width: size, height: size }}
          unoptimized={!!preview}
        />
      ) : (
        <div
          className="rounded-full bg-accent border-2 border-[var(--color-border)] flex items-center justify-center text-accent-dark font-medium"
          style={{ width: size, height: size, fontSize: size * 0.32 }}
        >
          {getInitials(displayName)}
        </div>
      )}

      {/* Badge de cámara */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Cambiar foto de perfil"
        className="absolute bottom-[-2px] right-[-2px] rounded-full bg-warm border-2 border-[var(--color-bg)] flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ width: badgeSize, height: badgeSize }}
      >
        {uploading ? (
          <div
            className="rounded-full border-2 border-accent-dark border-t-transparent animate-spin"
            style={{ width: badgeSize * 0.5, height: badgeSize * 0.5 }}
          />
        ) : (
          <Camera size={badgeSize * 0.5} strokeWidth={2} className="text-accent-dark" />
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
