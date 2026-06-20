"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Hash } from "lucide-react";
import Link from "next/link";
import { useJoinGroup } from "@/lib/hooks/useGroups";

function UnirseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [error, setError] = useState("");
  const joinGroup = useJoinGroup();

  useEffect(() => {
    const c = searchParams.get("code");
    if (c) setCode(c.trim());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    try {
      await joinGroup.mutateAsync(code.trim());
      router.push("/grupo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    }
  }

  return (
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

        {error && <p className="text-[13px] text-accent">{error}</p>}

        <button
          type="submit"
          disabled={code.trim().length < 4 || joinGroup.isPending}
          className="w-full bg-accent text-white rounded-pill py-3.5 text-[15px] font-medium disabled:opacity-50"
        >
          {joinGroup.isPending ? "Uniéndose..." : "Unirse al grupo"}
        </button>
      </form>
    </div>
  );
}

export default function UnirseGrupoPage() {
  return (
    <Suspense>
      <UnirseForm />
    </Suspense>
  );
}
