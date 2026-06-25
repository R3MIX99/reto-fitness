"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Shield, Search, Check } from "lucide-react";
import { usePlan, useAdminSearchUsers, useSetUserTier, TIER_LABEL, type Tier, type AdminUser } from "@/lib/hooks/usePlan";

const TIERS: Tier[] = ["free", "pro", "elite"];

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
        <Image src={url} alt={name ?? ""} width={36} height={36} className="object-cover w-full h-full" unoptimized={url.includes("?t=")} referrerPolicy="no-referrer" />
      </div>
    );
  }
  const initials = (name ?? "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-medium" style={{ background: "var(--color-surface)", color: "var(--color-fg)" }}>
      {initials}
    </div>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  const setTier = useSetUserTier();
  const [busy, setBusy] = useState<Tier | null>(null);

  async function apply(tier: Tier) {
    if (tier === u.tier) return;
    setBusy(tier);
    try { await setTier.mutateAsync({ userId: u.id, tier }); }
    finally { setBusy(null); }
  }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[16px] p-3.5">
      <div className="flex items-center gap-3 mb-3">
        <Avatar url={u.avatar_url} name={u.full_name} />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate">{u.full_name ?? "—"}</p>
          <p className="text-[11px] text-[var(--color-muted)] truncate">{u.email}</p>
        </div>
        {u.is_super_admin && (
          <span className="flex items-center gap-1 text-[10px] text-warm border border-warm/40 rounded-full px-2 py-0.5 flex-shrink-0">
            <Shield size={10} strokeWidth={1.5} /> Admin
          </span>
        )}
      </div>

      {u.is_super_admin ? (
        <p className="text-[11px] text-[var(--color-muted)] text-center">Siempre Elite ilimitado</p>
      ) : (
        <div className="flex gap-2">
          {TIERS.map((tier) => {
            const active = u.tier === tier;
            return (
              <button
                key={tier}
                onClick={() => apply(tier)}
                disabled={!!busy}
                className="flex-1 flex items-center justify-center gap-1 rounded-[10px] py-2 text-[12px] font-medium transition-colors disabled:opacity-50"
                style={{
                  background: active ? "var(--color-warm)" : "var(--color-surface)",
                  color: active ? "#1a1000" : "var(--color-muted)",
                  border: active ? "none" : "1px solid var(--color-border)",
                }}
              >
                {busy === tier ? "..." : (<>{active && <Check size={12} strokeWidth={2.5} />}{TIER_LABEL[tier]}</>)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { data: plan, isLoading } = usePlan();
  const [query, setQuery] = useState("");
  const isAdmin = plan?.is_super_admin === true;
  const { data: users = [], isFetching } = useAdminSearchUsers(query, isAdmin);

  if (isLoading) {
    return <div className="px-4 pt-10 text-center text-[13px] text-[var(--color-muted)]">Cargando…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-3">
        <Shield size={28} strokeWidth={1.5} className="text-[var(--color-muted)]" />
        <p className="text-[15px] font-medium">Acceso restringido</p>
        <p className="text-[13px] text-[var(--color-muted)]">Solo el super-admin puede ver esta página.</p>
        <button onClick={() => router.push("/perfil")} className="mt-2 text-[13px] text-warm">Volver al perfil</button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-[18px] py-3">
        <button onClick={() => router.back()} aria-label="Volver">
          <ChevronLeft size={22} strokeWidth={1.5} className="text-[var(--color-fg)]" />
        </button>
        <span className="text-[15px] font-medium">Super-admin</span>
        <span className="w-[22px]" />
      </div>

      <div className="px-4">
        <p className="text-[13px] text-[var(--color-muted)] mb-3">
          Otorga o retira planes Pro / Elite gratis a cualquier usuario.
        </p>

        {/* Buscador */}
        <div className="flex items-center gap-2 rounded-pill px-4 py-2.5 mb-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
          <Search size={16} strokeWidth={1.5} className="text-[var(--color-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-muted)]"
          />
        </div>

        <div className="space-y-2.5">
          {users.map((u) => <UserRow key={u.id} u={u} />)}
          {!isFetching && users.length === 0 && (
            <p className="text-[13px] text-[var(--color-muted)] text-center pt-6">Sin resultados.</p>
          )}
        </div>
      </div>
    </div>
  );
}
