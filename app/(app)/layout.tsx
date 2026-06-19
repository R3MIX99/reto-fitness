import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { WelcomeSplash } from "@/components/ui/WelcomeSplash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col" data-vaul-drawer-wrapper>
      {/* Top glow decorativo */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[230px] -translate-y-[110px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(238,229,233,0.28) 0%, rgba(238,229,233,0.10) 42%, rgba(0,0,0,0) 72%)",
        }}
        aria-hidden
      />

      <WelcomeSplash />

      <Header />

      <main className="flex-1 relative z-10">{children}</main>

      {/* Fade sobre el contenido antes del nav */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 h-[90px] z-20"
        style={{
          background:
            "linear-gradient(to top, var(--color-bg) 30%, transparent)",
        }}
        aria-hidden
      />

      <BottomNav />
    </div>
  );
}
