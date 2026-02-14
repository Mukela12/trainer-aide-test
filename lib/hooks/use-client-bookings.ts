'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const clientBookingKeys = {
  all: ['client-bookings'] as const,
  list: (userId: string) => ['client-bookings', userId] as const,
};

const clientPackageKeys = {
  all: ['client-packages'] as const,
  list: (userId: string) => ['client-packages', userId] as const,
};

export interface ClientBooking {
  id: string;
  scheduledAt: string;
  status: string;
  serviceName: string;
  trainerName: string;
  duration: number;
}

export interface ClientPackage {
  id: string;
  packageName: string;
  sessionsTotal: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'exhausted';
}

export interface ClientPackageData {
  totalCredits: number;
  creditStatus: 'none' | 'low' | 'medium' | 'good';
  nearestExpiry: string | null;
  packages: ClientPackage[];
}

async function fetchClientBookings(): Promise<ClientBooking[]> {
  const res = await fetch('/api/client/bookings');
  if (!res.ok) throw new Error('Failed to fetch bookings');
  const data = await res.json();
  return data.bookings || [];
}

async function fetchClientPackages(): Promise<ClientPackageData> {
  const res = await fetch('/api/client/packages');
  if (!res.ok) throw new Error('Failed to fetch packages');
  return res.json();
}

export function useClientBookings(userId: string | undefined) {
  return useQuery({
    queryKey: clientBookingKeys.list(userId || ''),
    queryFn: fetchClientBookings,
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useClientPackages(userId: string | undefined) {
  return useQuery({
    queryKey: clientPackageKeys.list(userId || ''),
    queryFn: fetchClientPackages,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

async function cancelClientBookingApi(bookingId: string): Promise<void> {
  const res = await fetch(`/api/client/bookings?id=${bookingId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to cancel booking');
  }
}

export function useCancelClientBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelClientBookingApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientBookingKeys.all });
    },
  });
}
