import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
import { WelcomeSplash } from "@/components/ui/WelcomeSplash";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { PlanWatcher } from "@/components/plan/PlanWatcher";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col" data-vaul-drawer-wrapper>
      <OnboardingGate />
      <WelcomeSplash />
      <PlanWatcher />

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

      <GuidedTour />
    </div>
  );
}
