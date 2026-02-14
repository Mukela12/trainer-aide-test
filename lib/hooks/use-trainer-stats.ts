'use client';

import { useQuery } from '@tanstack/react-query';

const trainerStatsKeys = {
  all: ['trainer-stats'] as const,
  detail: (trainerId: string) => ['trainer-stats', trainerId] as const,
};

export interface TrainerStats {
  totalClients: number;
  totalBookings: number;
  totalTemplates: number;
  upcomingBookings: number;
}

async function fetchTrainerStats(trainerId: string): Promise<TrainerStats> {
  const res = await fetch(`/api/trainers/${trainerId}/stats`);
  if (!res.ok) {
    // Return defaults if endpoint fails
    return { totalClients: 0, totalBookings: 0, totalTemplates: 0, upcomingBookings: 0 };
  }
  return res.json();
}

export function useTrainerStats(trainerId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: trainerStatsKeys.detail(trainerId || ''),
    queryFn: () => fetchTrainerStats(trainerId!),
    enabled: !!trainerId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}
