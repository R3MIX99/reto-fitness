import { Header } from "@/components/layout/Header";
import { BottomNavConditional } from "@/components/layout/BottomNavConditional";
import { WelcomeSplash } from "@/components/ui/WelcomeSplash";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { PlanWatcher } from "@/components/plan/PlanWatcher";
import { OfflineSyncProvider } from "@/components/providers/OfflineSyncProvider";
import { OfflineGuard } from "@/components/offline/OfflineGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col" data-vaul-drawer-wrapper>
      <OfflineSyncProvider />
      <OnboardingGate />
      <WelcomeSplash />
      <PlanWatcher />

      <Header />

      <main className="flex-1 relative z-10">
        <OfflineGuard>{children}</OfflineGuard>
      </main>

      <BottomNavConditional />

      <GuidedTour />
    </div>
  );
}
