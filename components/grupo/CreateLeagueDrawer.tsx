"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { useCreateLeague } from "@/lib/hooks/useLeague";
import { Trophy } from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onCreated?: () => void;
}

export function CreateLeagueDrawer({ open, onClose, groupId, onCreated }: Props) {
  const create = useCreateLeague();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(""); setCode(""); setStartDate(todayStr()); setError(null);
  }

  async function handleSave() {
    setError(null);
    const trimName = name.trim();
    const trimCode = code.trim().toUpperCase();
    if (!trimName) { setError("Escribe un nombre para la liga"); return; }
    if (trimCode.length < 4) { setError("Ingresa el código del grupo rival"); return; }

    try {
      const result = await create.mutateAsync({
        name: trimName,
        ownerGroupId: groupId,
        targetGroupCode: trimCode,
        startDate,
      });
      reset();
      onCreated?.();
      onClose();
      // small toast-less feedback via console — the UI updates via query invalidation
    } catch (e: any) {
      setError(e?.message ?? "Error al crear la liga");
    }
  }

  return (
    <Drawer open={open} onClose={() => { reset(); onClose(); }}>
      <div className="px-5 space-y-5 pb-6">
        <h2 className="font-display font-bold text-lg text-[var(--color-fg)]">Nueva liga</h2>
        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Nombre de la liga
          </label>
          <input
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            placeholder="Ej. Liga de verano 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Código del grupo rival */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Código del grupo rival
          </label>
          <p className="text-xs text-[var(--color-muted)]">
            El dueño del grupo rival comparte su código de invitación de 6 letras.
          </p>
          <input
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] uppercase tracking-widest font-display"
            placeholder="XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>

        {/* Fecha de inicio */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Inicia el
          </label>
          <input
            type="date"
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={create.isPending}
          className="w-full py-3.5 rounded-2xl bg-[var(--color-accent)] text-white font-display font-semibold text-sm disabled:opacity-50"
        >
          {create.isPending ? "Enviando invitación…" : "Crear liga e invitar"}
        </button>

        <div className="flex items-start gap-3 bg-[var(--color-warm)]/10 rounded-xl px-4 py-3">
          <Trophy className="w-4 h-4 text-[var(--color-warm)] mt-0.5 shrink-0" />
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            El dueño del grupo rival recibirá una invitación. Los standings se
            calculan con los puntos de todos los miembros de cada grupo desde la
            fecha de inicio.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
