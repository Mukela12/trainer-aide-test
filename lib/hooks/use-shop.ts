'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ShopPackage {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  perSessionPriceCents: number | null;
  savingsPercent: number | null;
  isFree: boolean;
}

export interface ShopOffer {
  id: string;
  title: string;
  description: string | null;
  paymentAmount: number;
  currency: string;
  credits: number;
  expiryDays: number | null;
  expiresAt: string | null;
  remainingSpots: number | null;
  isGift: boolean;
  isFree: boolean;
}

const shopKeys = {
  all: ['shop'] as const,
  packages: () => ['shop', 'packages'] as const,
  offers: () => ['shop', 'offers'] as const,
};

/** Fetches shop packages from /api/client/shop/packages */
export function useShopPackages() {
  return useQuery({
    queryKey: shopKeys.packages(),
    queryFn: async (): Promise<ShopPackage[]> => {
      const res = await fetch('/api/client/shop/packages');
      if (!res.ok) throw new Error('Failed to fetch packages');
      const data = await res.json();
      return data.packages || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches shop offers from /api/client/shop/offers */
export function useShopOffers() {
  return useQuery({
    queryKey: shopKeys.offers(),
    queryFn: async (): Promise<ShopOffer[]> => {
      const res = await fetch('/api/client/shop/offers');
      if (!res.ok) throw new Error('Failed to fetch offers');
      const data = await res.json();
      return data.offers || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** POST /api/client/shop/claim */
export function useClaimShopItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: 'package' | 'offer'; id: string }) => {
      const res = await fetch('/api/client/shop/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim item');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
}
