"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import { useCreateGroup } from "@/lib/hooks/useGroups";
import { SuccessModal } from "@/components/ui/SuccessModal";

export default function CrearGrupoPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const createGroup = useCreateGroup();

  const handleDone = useCallback(() => {
    router.push("/grupo");
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await createGroup.mutateAsync(name.trim());
      setShowSuccess(true);
    } catch (err) {
      // Muestra el mensaje real (p. ej. límite de grupos del plan)
      setError(err instanceof Error ? err.message : "Error al crear el grupo. Inténtalo de nuevo.");
    }
  }

  return (
    <>
      {showSuccess && (
        <SuccessModal
          title="¡Grupo creado!"
          subtitle={`"${name}" está listo para competir`}
          onDone={handleDone}
        />
      )}

      <div className="px-4 pb-28 pt-2">
        {/* Barra superior */}
        <div className="flex items-center justify-between py-3 mb-6">
          <Link href="/grupo" aria-label="Volver">
            <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
          </Link>
          <span className="text-[15px] font-medium">Nuevo grupo</span>
          <div className="w-[22px]" />
        </div>

        {/* Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-3">
            <Users size={28} strokeWidth={1.5} className="text-accent" />
          </div>
          <p className="text-[13px] text-[var(--color-muted)] text-center max-w-[240px]">
            Crea tu grupo de competencia y comparte el código de invitación con tus amigos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] text-[var(--color-muted)] mb-2 block">
              Nombre del grupo
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Los Más Fuertes"
              maxLength={40}
              className="w-full bg-[var(--color-bg-card)] rounded-[14px] px-4 py-3 text-[15px] text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none border border-transparent focus:border-accent/40"
            />
          </div>

          {error && <p className="text-[13px] text-accent">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || createGroup.isPending || showSuccess}
            className="w-full bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium disabled:opacity-50 transition-opacity"
          >
            {createGroup.isPending ? "Creando..." : "Crear grupo"}
          </button>
        </form>
      </div>
    </>
  );
}
