/**
 * Dashboard Layout - With sidebar and navigation
 * Protected routes for authenticated users only
 */

import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { GlobalSessionTimer } from "@/components/session/GlobalSessionTimer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden pb-20 lg:pb-0">
      <Sidebar />
      <MobileNav />
      <main className="lg:ml-64 pt-14 lg:pt-0">
        {children}
      </main>
      <MobileBottomNav />
      <GlobalSessionTimer />
    </div>
  );
}
