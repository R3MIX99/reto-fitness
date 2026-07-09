"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, Camera } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { PhotoSourceDrawer } from "@/components/checklist/PhotoSourceDrawer";
import { getInitials, type GroupMemberWithProfile } from "@/lib/hooks/useGroups";
import { useAttendance, useSetAttendance, useSetMemory, useMemoryForOccurrence, signedMemoryUrl, type Challenge } from "@/lib/hooks/useChallenges";
import { compressImage } from "@/lib/hooks/useProfile";

interface Props {
  open: boolean;
  onClose: () => void;
  challenge: Challenge;
  date: string;
  members: GroupMemberWithProfile[];
}

export function AttendanceDrawer({ open, onClose, challenge, date, members }: Props) {
  const { data: initial = [] } = useAttendance(open ? challenge.id : null, date);
  const { data: existingPath = null } = useMemoryForOccurrence(open ? challenge.id : null, date);
  const setAtt = useSetAttendance();
  const setMem = useSetMemory();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inicializa la selección con los asistentes guardados al abrir
  useEffect(() => {
    if (open) setSelected(new Set(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial.join(",")]);

  // Foto nueva (preview local)
  useEffect(() => {
    if (!photo) { setPhotoUrl(null); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  // Foto ya subida antes (preview firmado)
  useEffect(() => {
    if (existingPath) signedMemoryUrl(existingPath).then(setExistingUrl);
    else setExistingUrl(null);
  }, [existingPath]);

  const preview = photoUrl ?? existingUrl;
  const hasPhoto = !!photo || !!existingPath;
  const canSave = selected.size > 0 && hasPhoto;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save() {
    setError(null);
    try {
      await setAtt.mutateAsync({ challengeId: challenge.id, date, userIds: Array.from(selected) });
      if (photo) await setMem.mutateAsync({ groupId: challenge.group_id, challengeId: challenge.id, date, file: photo });
      setPhoto(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar");
    }
  }

  const busy = setAtt.isPending || setMem.isPending;

  return (
    <Drawer open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-1">
        <p className="font-display font-semibold text-[18px] text-center mb-1">{challenge.title}</p>
        <p className="text-[12px] text-[var(--color-muted)] text-center mb-4">
          Marca quién asistió · +{challenge.points} pts a cada uno
        </p>

        {/* Foto grupal de recuerdo (cámara o galería) */}
        <button
          onClick={() => setSourceOpen(true)}
          className="w-full rounded-[14px] mb-4 overflow-hidden flex items-center justify-center"
          style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border)", minHeight: 120 }}
        >
          {preview ? (
            <div className="relative w-full" style={{ height: 160 }}>
              <Image src={preview} alt="Recuerdo" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-6 text-[var(--color-muted)]">
              <Camera size={22} strokeWidth={1.5} />
              <span className="text-[12px]">Tomar foto o elegir de galería (obligatoria)</span>
            </div>
          )}
        </button>
        <PhotoSourceDrawer
          open={sourceOpen}
          onClose={() => setSourceOpen(false)}
          onFileSelected={(f) => {
            setSourceOpen(false);
            // Comprimir al recibir la foto (evita OOM con fotos de cámara grandes).
            void compressImage(f, 1080).then(setPhoto);
          }}
          title="Foto de recuerdo"
          subtitle="Toma una foto del momento o elige una de tu galería"
        />

        {/* Lista de miembros */}
        <div className="flex flex-col gap-1.5 max-h-[38vh] overflow-y-auto no-scrollbar mb-4">
          {members.map((m) => {
            const on = selected.has(m.user_id);
            return (
              <button key={m.user_id} onClick={() => toggle(m.user_id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors"
                style={{
                  background: on ? "rgba(239,200,139,0.10)" : "var(--color-surface)",
                  border: on ? "1.5px solid var(--color-warm)" : "1px solid var(--color-border)",
                }}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-bg-card)" }}>
                  {m.avatar_url
                    ? <Image src={m.avatar_url} alt={m.full_name ?? ""} width={32} height={32} className="object-cover w-full h-full" unoptimized={m.avatar_url.includes("?t=")} referrerPolicy="no-referrer" />
                    : <span className="text-[11px] font-medium text-[var(--color-muted)]">{getInitials(m.full_name)}</span>}
                </div>
                <span className="flex-1 text-left text-[14px] truncate" style={{ color: on ? "var(--color-warm)" : "var(--color-fg)" }}>
                  {m.full_name ?? "—"}
                </span>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: on ? "var(--color-warm)" : "transparent", border: on ? "none" : "1.5px solid var(--color-border)" }}>
                  {on && <Check size={13} strokeWidth={3} className="text-[#1a1000]" />}
                </div>
              </button>
            );
          })}
        </div>

        {error && <p className="text-[12px] text-red-400 mb-2">{error}</p>}
        {!canSave && (
          <p className="text-[11px] text-[var(--color-muted)] text-center mb-2">
            Selecciona al menos un asistente y sube la foto de recuerdo para guardar.
          </p>
        )}

        <button onClick={save} disabled={busy || !canSave}
          className="w-full bg-warm text-accent-dark rounded-pill py-3.5 text-[14px] font-medium disabled:opacity-50">
          {busy ? "Guardando..." : `Guardar asistencia (${selected.size})`}
        </button>
      </div>
    </Drawer>
  );
}
