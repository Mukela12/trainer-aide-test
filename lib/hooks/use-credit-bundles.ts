'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreditBundle } from '@/lib/types/credit-bundle';

const bundleKeys = {
  all: ['credit-bundles'] as const,
  list: () => ['credit-bundles', 'list'] as const,
};

/** Fetches credit bundles from /api/credit-bundles */
export function useCreditBundles() {
  return useQuery({
    queryKey: bundleKeys.list(),
    queryFn: async (): Promise<CreditBundle[]> => {
      const res = await fetch('/api/credit-bundles');
      if (!res.ok) throw new Error('Failed to fetch bundles');
      const data = await res.json();
      return data.bundles || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** POST or PUT /api/credit-bundles */
export function useSaveCreditBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; credit_count: number; total_price: number; expiry_days: number }) => {
      const method = input.id ? 'PUT' : 'POST';
      const res = await fetch('/api/credit-bundles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to save bundle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.all });
    },
  });
}

/** DELETE /api/credit-bundles?id=... */
export function useDeleteCreditBundle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bundleId: string) => {
      const res = await fetch(`/api/credit-bundles?id=${bundleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bundle');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bundleKeys.all });
    },
  });
}
