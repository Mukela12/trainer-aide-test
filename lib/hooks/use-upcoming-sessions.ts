'use client';

import { useQuery } from '@tanstack/react-query';

const upcomingSessionKeys = {
  all: ['upcoming-sessions'] as const,
  list: (userId: string, limit: number) => ['upcoming-sessions', userId, limit] as const,
};

export interface UpcomingSessionData {
  id: string;
  clientName: string;
  scheduledAt: string;
  serviceName: string;
  status: string;
}

async function fetchUpcomingSessions(limit: number = 5): Promise<UpcomingSessionData[]> {
  const res = await fetch(`/api/sessions/upcoming?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch upcoming sessions');
  const data = await res.json();
  return data.sessions || [];
}

export function useUpcomingSessions(userId: string | undefined, limit: number = 5) {
  return useQuery({
    queryKey: upcomingSessionKeys.list(userId || '', limit),
    queryFn: () => fetchUpcomingSessions(limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
