'use client';

import { useQuery } from '@tanstack/react-query';

// Key factory
const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (userId: string) => ['analytics', 'dashboard', userId] as const,
};

// Service client function (inline since it's simple)
async function fetchDashboardAnalytics(): Promise<{
  earningsThisWeek: number;
  sessionsThisWeek: number;
  activeClients: number;
  softHoldsCount: number;
  utilizationPercent: number;
  averageRpe: number;
  outstandingCredits: number;
  lowCreditClients: number;
}> {
  const res = await fetch('/api/analytics/dashboard');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export function useAnalytics(userId: string | undefined) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(userId || ''),
    queryFn: fetchDashboardAnalytics,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes (dashboards should refresh more often)
  });
}
