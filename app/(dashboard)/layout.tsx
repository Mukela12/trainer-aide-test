/**
 * Dashboard Layout - With sidebar and navigation
 * Protected routes for authenticated users only
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GlobalSessionTimer } from "@/components/session/GlobalSessionTimer";
import { OnboardingGuard } from "@/components/providers/OnboardingGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingGuard>
      <div className="min-h-screen overflow-x-hidden pb-20 lg:pb-0">
        <Sidebar />
        <MobileNav />
        <main className="pt-14 lg:pt-0 transition-all duration-300" style={{ marginLeft: 'var(--sidebar-width, 16rem)' } as React.CSSProperties}>
          <style>{`@media (max-width: 1023px) { main { margin-left: 0 !important; } }`}</style>
          {children}
        </main>
        <MobileBottomNav />
        <GlobalSessionTimer />
      </div>
    </OnboardingGuard>
  );
}
