// PROMPT 2 — Pantalla de login (placeholder hasta implementar Auth con Google)
export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display font-semibold text-3xl text-[var(--color-fg)]">
            Reto Fitness
          </h1>
          <p className="text-[var(--color-muted)] text-sm">
            Compite con tus amigos
          </p>
        </div>

        <button
          className="w-full flex items-center justify-center gap-3 bg-[var(--color-bg-card)] border border-[#2a2a2a] rounded-pill px-5 py-3 text-[var(--color-fg)] text-sm font-medium transition-opacity hover:opacity-80"
          disabled
        >
          Continuar con Google
        </button>

        <p className="text-center text-xs text-[var(--color-muted)]">
          Configura Supabase Auth para habilitar el login
        </p>
      </div>
    </main>
  );
}
