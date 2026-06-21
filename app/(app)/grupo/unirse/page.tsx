"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Hash, Check, Users, Shield } from "lucide-react";
import Link from "next/link";
import { useJoinGroup, useLookupGroup } from "@/lib/hooks/useGroups";

// ── Modal de éxito ─────────────────────────────────────────────────────────

function SuccessModal({
  groupName,
  ownerName,
  onContinue,
}: {
  groupName: string;
  ownerName: string;
  onContinue: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // pequeño delay para que la animación arranque después del mount
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{
        background: "rgba(0,0,0,0.85)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}
    >
      <div
        className="w-full max-w-[320px] rounded-[26px] p-8 flex flex-col items-center text-center"
        style={{
          background: "var(--color-bg-card)",
          transform: visible ? "scale(1) translateY(0)" : "scale(0.88) translateY(24px)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Ícono animado */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
          style={{
            background: "rgba(207,92,54,0.15)",
            border: "2px solid #CF5C36",
            transform: visible ? "scale(1)" : "scale(0.5)",
            transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s",
          }}
        >
          <Check size={36} strokeWidth={2} className="text-accent" />
        </div>

        <p
          className="font-display font-semibold text-[22px] mb-1"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.4s ease 0.25s",
          }}
        >
          ¡Te uniste!
        </p>

        <p
          className="text-[15px] font-medium text-warm mb-1"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.4s ease 0.32s",
          }}
        >
          {groupName}
        </p>

        <div
          className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] mb-7"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.4s ease 0.4s",
          }}
        >
          <Users size={12} strokeWidth={1.5} />
          Administrado por {ownerName}
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.4s ease 0.48s",
          }}
        >
          Ir al grupo
        </button>
      </div>
    </div>
  );
}

// ── Formulario ─────────────────────────────────────────────────────────────

function UnirseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState<{ id: string; name: string; owner_name: string } | null>(null);
  const joinGroup = useJoinGroup();
  const { data: preview, isFetching: lookingUp } = useLookupGroup(code);

  useEffect(() => {
    const c = searchParams.get("code");
    if (c) setCode(c.trim());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    try {
      const result = await joinGroup.mutateAsync(code.trim());
      setJoined({ id: result.id, name: result.name, owner_name: (result as { owner_name?: string }).owner_name ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    }
  }

  return (
    <>
      <div className="px-4 pb-28 pt-2">
        <div className="flex items-center justify-between py-3 mb-6">
          <Link href="/grupo" aria-label="Volver">
            <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
          </Link>
          <span className="text-[15px] font-medium">Unirse a grupo</span>
          <div className="w-[22px]" />
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-warm/20 flex items-center justify-center mb-3">
            <Hash size={28} strokeWidth={1.5} className="text-warm" />
          </div>
          <p className="text-[13px] text-[var(--color-muted)] text-center max-w-[240px]">
            Ingresa el código de invitación que te compartió el administrador del grupo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[13px] text-[var(--color-muted)] mb-2 block">
              Código de invitación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Pega o escribe el código"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-[var(--color-bg-card)] rounded-[14px] px-4 py-3 text-[18px] font-display font-medium tracking-widest text-center text-warm placeholder:text-[var(--color-muted)] placeholder:text-[14px] placeholder:tracking-normal outline-none border border-transparent focus:border-warm/40"
            />
          </div>

          {/* Preview del grupo */}
          {code.trim().length >= 4 && (
            <div className="rounded-[16px] bg-[var(--color-bg-card)] overflow-hidden transition-all" style={{ border: "1px solid var(--color-border)" }}>
              {lookingUp ? (
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="w-4 h-4 border-2 border-t-warm rounded-full animate-spin flex-shrink-0" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-warm)" }} />
                  <p className="text-[13px] text-[var(--color-muted)]">Buscando grupo…</p>
                </div>
              ) : preview ? (
                <div className="px-4 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm/15 flex items-center justify-center flex-shrink-0">
                    <Users size={18} strokeWidth={1.5} className="text-warm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium truncate">{preview.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Shield size={10} strokeWidth={1.5} className="text-[var(--color-muted)]" />
                      <p className="text-[12px] text-[var(--color-muted)] truncate">
                        {preview.owner_name} · {preview.member_count} {preview.member_count === 1 ? "miembro" : "miembros"}
                      </p>
                    </div>
                  </div>
                  <Check size={16} strokeWidth={2} className="text-warm flex-shrink-0" />
                </div>
              ) : (
                <div className="px-4 py-4">
                  <p className="text-[13px] text-accent">Código no encontrado</p>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-[13px] text-accent">{error}</p>}

          <button
            type="submit"
            disabled={!preview || joinGroup.isPending}
            className="w-full bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium disabled:opacity-50"
          >
            {joinGroup.isPending ? "Uniéndose..." : "Unirse al grupo"}
          </button>
        </form>
      </div>

      {joined && (
        <SuccessModal
          groupName={joined.name}
          ownerName={joined.owner_name}
          onContinue={() => router.push(`/grupo?joined=${joined.id}`)}
        />
      )}
    </>
  );
}

export default function UnirseGrupoPage() {
  return (
    <Suspense>
      <UnirseForm />
    </Suspense>
  );
}
