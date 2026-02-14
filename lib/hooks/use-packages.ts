'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Types ---

export interface PackageData {
  id: string;
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number;
  perSessionPriceCents: number | null;
  isActive: boolean;
  isPublic: boolean;
}

export interface ClientPackage {
  id: string;
  clientName: string;
  packageName: string;
  creditsRemaining: number;
  creditsTotal: number;
  expiresAt: string | null;
}

interface CreatePackageInput {
  name: string;
  description: string | null;
  sessionCount: number;
  priceCents: number;
  validityDays: number;
  isPublic: boolean;
}

// --- Key factory ---

const packageKeys = {
  all: ['packages'] as const,
  list: () => ['packages', 'list'] as const,
  wrapped: () => ['packages', 'wrapped'] as const,
};

// --- Hooks ---

/** Fetches packages from /api/packages (flat array, used by solo) */
export function usePackages() {
  return useQuery({
    queryKey: packageKeys.list(),
    queryFn: async (): Promise<PackageData[]> => {
      const res = await fetch('/api/packages');
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches packages from /api/packages?format=wrapped (packages + clientPackages, used by studio-owner) */
export function useWrappedPackages() {
  return useQuery({
    queryKey: packageKeys.wrapped(),
    queryFn: async (): Promise<{ packages: PackageData[]; clientPackages: ClientPackage[] }> => {
      const res = await fetch('/api/packages?format=wrapped');
      if (!res.ok) throw new Error('Failed to fetch packages');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** POST /api/packages */
export function useCreatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePackageInput) => {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create package');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packageKeys.all });
    },
  });
}

/** DELETE /api/packages?id=... */
export function useDeletePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (packageId: string) => {
      const res = await fetch(`/api/packages?id=${packageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete package');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packageKeys.all });
    },
  });
}
