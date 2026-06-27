import { Header } from "@/components/layout/Header";
import { BottomNavConditional } from "@/components/layout/BottomNavConditional";
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

      <BottomNavConditional />

      <GuidedTour />
    </div>
  );
}
