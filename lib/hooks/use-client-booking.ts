'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import type { ClientService, StudioTrainer } from '@/lib/types/client-booking';

const clientBookingKeys = {
  services: () => ['client-booking', 'services'] as const,
  trainers: () => ['client-booking', 'trainers'] as const,
  credits: () => ['client-booking', 'credits'] as const,
};

/** Fetches studio services for the client from /api/client/studio/services */
export function useClientStudioServices() {
  return useQuery({
    queryKey: clientBookingKeys.services(),
    queryFn: async (): Promise<ClientService[]> => {
      const res = await fetch('/api/client/studio/services');
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      return data.services || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches studio trainers for the client from /api/client/studio/trainers */
export function useClientStudioTrainers() {
  return useQuery({
    queryKey: clientBookingKeys.trainers(),
    queryFn: async (): Promise<StudioTrainer[]> => {
      const res = await fetch('/api/client/studio/trainers');
      if (!res.ok) throw new Error('Failed to fetch trainers');
      const data = await res.json();
      return data.trainers || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches client credits from /api/client/packages */
export function useClientCredits() {
  return useQuery({
    queryKey: clientBookingKeys.credits(),
    queryFn: async (): Promise<number> => {
      const res = await fetch('/api/client/packages');
      if (!res.ok) return 0;
      const data = await res.json();
      return data.totalCredits || 0;
    },
    staleTime: 2 * 60 * 1000,
  });
}

/** POST /api/client/bookings */
export function useCreateClientBooking() {
  return useMutation({
    mutationFn: async (input: { serviceId: string; trainerId: string; scheduledAt: string }) => {
      const res = await fetch('/api/client/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create booking');
      return data;
    },
  });
}
