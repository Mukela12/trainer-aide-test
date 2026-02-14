'use client';

import { useQuery } from '@tanstack/react-query';

export interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  staff_type: string;
  is_onboarded: boolean;
  created_at: string;
}

const trainerKeys = {
  all: ['trainers'] as const,
  list: () => ['trainers', 'list'] as const,
};

/** Fetches studio trainers/staff from /api/trainers */
export function useTrainers() {
  return useQuery({
    queryKey: trainerKeys.list(),
    queryFn: async (): Promise<StaffMember[]> => {
      const res = await fetch('/api/trainers');
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const data = await res.json();
      return data.trainers || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
