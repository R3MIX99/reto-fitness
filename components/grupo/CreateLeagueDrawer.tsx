"use client";

import { useState, useEffect } from "react";
import { Drawer } from "@/components/ui/Drawer";
import {
  useCreateLeague,
  useCreateLeagueBetweenMyGroups,
  useGroupPreview,
} from "@/lib/hooks/useLeague";
import { useMyGroups } from "@/lib/hooks/useGroups";
import { useUser } from "@/lib/hooks/useUser";
import {
  Trophy, Users, Crown, CheckCircle2, AlertCircle, Loader2, ChevronRight,
} from "lucide-react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Mode = "pick" | "my-groups" | "other-group";

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onCreated?: () => void;
}

// ── Step 1: elegir modo ────────────────────────────────────────────────────
function StepPick({ onPick }: { onPick: (m: "my-groups" | "other-group") => void }) {
  return (
    <div className="px-5 pb-8 space-y-4">
      <h2 className="font-display font-bold text-lg text-[var(--color-fg)]">Nueva liga</h2>
      <p className="text-sm text-[var(--color-muted)]">¿Con quién quieres competir?</p>

      <button
        onClick={() => onPick("my-groups")}
        className="w-full flex items-center gap-4 bg-white/5 rounded-2xl p-4 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-[var(--color-warm)]" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm text-[var(--color-fg)]">Entre mis grupos</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Selecciona dos de tus grupos para competir entre ellos.
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
      </button>

      <button
        onClick={() => onPick("other-group")}
        className="w-full flex items-center gap-4 bg-white/5 rounded-2xl p-4 text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-[var(--color-accent)]" />
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm text-[var(--color-fg)]">Con otro grupo</p>
          <p className="text-xs text-[var(--color-muted)] mt-0.5">
            Invita a un grupo externo por código. Necesitan ser Elite.
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-[var(--color-muted)] shrink-0" />
      </button>
    </div>
  );
}

// ── Step 2a: mis grupos ────────────────────────────────────────────────────
function StepMyGroups({
  onBack,
  onCreated,
  onClose,
}: {
  onBack: () => void;
  onCreated?: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const create = useCreateLeagueBetweenMyGroups();
  const ownedGroups = groups.filter((g) => g.owner_id === user?.id);

  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  function toggleGroup(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]
    );
  }

  const canCreate = selected.length === 2 && name.trim().length > 0;

  async function handleCreate() {
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim(), groupA: selected[0], groupB: selected[1], startDate });
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Error al crear la liga");
    }
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-[var(--color-muted)]">← Atrás</button>
        <h2 className="font-display font-bold text-lg text-[var(--color-fg)]">Entre mis grupos</h2>
      </div>

      {/* Selección de grupos */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
          Selecciona 2 grupos
        </label>
        {ownedGroups.length < 2 ? (
          <p className="text-xs text-[var(--color-muted)] bg-white/5 rounded-xl px-4 py-3">
            Necesitas al menos 2 grupos para crear una liga entre ellos.
          </p>
        ) : (
          <div className="space-y-2">
            {ownedGroups.map((g) => {
              const isSelected = selected.includes(g.id);
              const selIdx = selected.indexOf(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "ring-1 ring-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "bg-white/5"
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[var(--color-warm)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate">{g.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{g.members?.length ?? 0} miembros</p>
                  </div>
                  {isSelected && (
                    <span className="w-6 h-6 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {selIdx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Nombre de la liga</label>
        <input
          className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          placeholder="Ej. Duelo interno junio 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </div>

      {/* Fecha */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Inicia el</label>
        <input
          type="date"
          className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={!canCreate || create.isPending}
        className="w-full py-3.5 rounded-2xl bg-[var(--color-accent)] text-white font-display font-semibold text-sm disabled:opacity-40"
      >
        {create.isPending ? "Creando…" : "Crear liga"}
      </button>
    </div>
  );
}

// ── Step 2b: otro grupo ────────────────────────────────────────────────────
function GroupPreviewCard({ preview, isSelf }: { preview: NonNullable<ReturnType<typeof useGroupPreview>["data"]>; isSelf: boolean }) {
  const isElite = preview.owner_tier === "elite";
  return (
    <div className={`rounded-2xl px-4 py-3.5 space-y-2 ${isElite ? "bg-[var(--color-warm)]/8 ring-1 ring-[var(--color-warm)]/20" : "bg-white/5 ring-1 ring-red-500/20"}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
          <Users className="w-4 h-4 text-[var(--color-warm)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-[var(--color-fg)] truncate">{preview.group_name}</p>
          <p className="text-xs text-[var(--color-muted)]">Dueño: {preview.owner_name}</p>
        </div>
        {isElite ? (
          <Crown className="w-4 h-4 text-[var(--color-warm)] shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-4 text-xs">
        <span className="text-[var(--color-muted)]">
          <strong className="text-[var(--color-fg)]">{preview.member_count}</strong> miembro{preview.member_count !== 1 ? "s" : ""}
        </span>
        <span className={`font-display font-semibold uppercase text-[11px] px-2 py-0.5 rounded-full ${
          isElite ? "bg-[var(--color-warm)]/20 text-[var(--color-warm)]" : "bg-red-500/15 text-red-400"
        }`}>
          {preview.owner_tier === "free" ? "Free" : preview.owner_tier === "pro" ? "Pro" : "Elite"}
        </span>
      </div>
      {isSelf && (
        <p className="text-xs text-red-400">No puedes invitar a tu propio grupo.</p>
      )}
      {!isElite && !isSelf && (
        <p className="text-xs text-red-400">
          Este grupo necesita plan Elite para participar en una liga.
        </p>
      )}
      {isElite && !isSelf && (
        <div className="flex items-center gap-1.5 text-xs text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Listo para competir
        </div>
      )}
    </div>
  );
}

function StepOtherGroup({
  ownerGroupId,
  onBack,
  onCreated,
  onClose,
}: {
  ownerGroupId: string;
  onBack: () => void;
  onCreated?: () => void;
  onClose: () => void;
}) {
  const { user } = useUser();
  const { data: groups = [] } = useMyGroups();
  const create = useCreateLeague();

  const ownedGroups = groups.filter((g) => g.owner_id === user?.id);

  const [myGroupId, setMyGroupId] = useState(ownerGroupId);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [error, setError] = useState<string | null>(null);

  const { data: preview, isFetching: loadingPreview, isError: previewError } = useGroupPreview(code);

  const isSelf = preview?.group_id === myGroupId ||
    ownedGroups.some((g) => g.id === preview?.group_id);
  const previewReady = code.trim().length >= 4;
  const previewElite = preview?.owner_tier === "elite";

  const canCreate =
    name.trim().length > 0 &&
    previewReady &&
    !!preview &&
    previewElite &&
    !isSelf &&
    !create.isPending;

  async function handleCreate() {
    setError(null);
    try {
      await create.mutateAsync({
        name: name.trim(),
        ownerGroupId: myGroupId,
        targetGroupCode: code.trim().toUpperCase(),
        startDate,
      });
      onCreated?.();
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Error al crear la liga");
    }
  }

  return (
    <div className="px-5 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-[var(--color-muted)]">← Atrás</button>
        <h2 className="font-display font-bold text-lg text-[var(--color-fg)]">Con otro grupo</h2>
      </div>

      {/* Mi grupo que compite */}
      {ownedGroups.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
            Tu grupo que compite
          </label>
          <div className="space-y-2">
            {ownedGroups.map((g) => {
              const active = myGroupId === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setMyGroupId(g.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${
                    active
                      ? "ring-1 ring-[var(--color-accent)] bg-[var(--color-accent)]/10"
                      : "bg-white/5"
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-warm)]/15 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-[var(--color-warm)]" />
                  </div>
                  <p className="flex-1 font-display text-sm text-[var(--color-fg)] truncate">{g.name}</p>
                  {active && (
                    <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Nombre de la liga</label>
        <input
          className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          placeholder="Ej. Liga de verano 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
        />
      </div>

      {/* Código del rival */}
      <div className="space-y-2">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Código del grupo rival</label>
        <p className="text-xs text-[var(--color-muted)]">
          El dueño del grupo rival lo encuentra en la tarjeta de su grupo.
        </p>
        <div className="relative">
          <input
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted)] outline-none focus:ring-1 focus:ring-[var(--color-accent)] uppercase tracking-widest font-display pr-10"
            placeholder="XXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          {loadingPreview && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] animate-spin" />
          )}
        </div>

        {/* Preview del grupo */}
        {previewReady && !loadingPreview && (
          previewError || !preview ? (
            <div className="bg-red-500/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400">No se encontró ningún grupo con ese código.</p>
            </div>
          ) : (
            <GroupPreviewCard preview={preview} isSelf={isSelf} />
          )
        )}
      </div>

      {/* Fecha */}
      <div className="space-y-1.5">
        <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Inicia el</label>
        <input
          type="date"
          className="w-full bg-white/5 rounded-xl px-4 py-3 text-sm text-[var(--color-fg)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-xl px-4 py-2">{error}</p>}

      <button
        onClick={handleCreate}
        disabled={!canCreate}
        className="w-full py-3.5 rounded-2xl bg-[var(--color-accent)] text-white font-display font-semibold text-sm disabled:opacity-40 transition-opacity"
      >
        {create.isPending ? "Enviando invitación…" : "Crear liga e invitar"}
      </button>
    </div>
  );
}

// ── Contenedor principal ───────────────────────────────────────────────────
export function CreateLeagueDrawer({ open, onClose, groupId, onCreated }: Props) {
  const [mode, setMode] = useState<Mode>("pick");

  function handleClose() {
    setMode("pick");
    onClose();
  }

  return (
    <Drawer open={open} onClose={handleClose}>
      <div className="overflow-y-auto" style={{ maxHeight: "80dvh" }}>
        {mode === "pick" && (
          <StepPick onPick={(m) => setMode(m)} />
        )}
        {mode === "my-groups" && (
          <StepMyGroups onBack={() => setMode("pick")} onCreated={onCreated} onClose={handleClose} />
        )}
        {mode === "other-group" && (
          <StepOtherGroup ownerGroupId={groupId} onBack={() => setMode("pick")} onCreated={onCreated} onClose={handleClose} />
        )}
      </div>
    </Drawer>
  );
}
