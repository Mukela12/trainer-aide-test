'use client';

import { useQuery } from '@tanstack/react-query';
import type { BookingHistoryItem } from '@/lib/types/booking-history';

const bookingHistoryKeys = {
  all: ['booking-history'] as const,
  client: (clientId: string) => ['booking-history', clientId] as const,
};

async function fetchBookingHistory(clientId: string): Promise<BookingHistoryItem[]> {
  const params = new URLSearchParams({ client_id: clientId });
  const res = await fetch(`/api/clients/booking-history?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch booking history');
  }
  const data = await res.json();
  return data.bookings || [];
}

export function useBookingHistory(clientId: string | undefined) {
  return useQuery({
    queryKey: bookingHistoryKeys.client(clientId || ''),
    queryFn: () => fetchBookingHistory(clientId!),
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}
