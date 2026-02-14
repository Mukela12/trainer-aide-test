'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  payment_amount: number;
  currency: string;
  max_referrals: number | null;
  current_referrals: number;
  expires_at: string | null;
  credits: number;
  expiry_days: number | null;
  is_gift: boolean;
  is_active: boolean;
  created_at: string;
}

interface SaveOfferInput {
  id?: string;
  title: string;
  description: string;
  payment_amount: number;
  max_referrals: number;
  credits: number;
  expiry_days: number;
  is_gift: boolean;
}

const offerKeys = {
  all: ['offers'] as const,
  list: () => ['offers', 'list'] as const,
};

/** Fetches offers from /api/offers */
export function useOffers() {
  return useQuery({
    queryKey: offerKeys.list(),
    queryFn: async (): Promise<Offer[]> => {
      const res = await fetch('/api/offers');
      if (!res.ok) throw new Error('Failed to fetch offers');
      const data = await res.json();
      return data.offers || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** POST or PUT /api/offers */
export function useSaveOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveOfferInput) => {
      const method = input.id ? 'PUT' : 'POST';
      const res = await fetch('/api/offers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to save offer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}

/** DELETE /api/offers?id=... */
export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      const res = await fetch(`/api/offers?id=${offerId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete offer');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}
