'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const clientKeys = {
  all: ['clients'] as const,
  list: (userId: string) => ['clients', userId] as const,
};

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  studio_id: string;
  invited_by: string | null;
  is_onboarded: boolean;
  is_archived: boolean;
  credits: number | null;
  created_at: string;
  experience_level: string;
  primary_goal: string;
  available_equipment: string[];
  injuries: Array<{ body_part: string; description: string; restrictions: string[] }>;
  is_active: boolean;
  invitation_status: string | null;
  invitation_expires_at?: string;
  last_session_date?: string | null;
}

async function fetchClients(): Promise<ClientRecord[]> {
  const res = await fetch('/api/clients');
  if (!res.ok) throw new Error('Failed to fetch clients');
  const data = await res.json();
  return data.clients || [];
}

async function createClientApi(body: Record<string, unknown>): Promise<{ client: ClientRecord; emailSent: boolean; emailError: string | null }> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create client');
  }
  return res.json();
}

async function updateClientApi(body: Record<string, unknown>): Promise<{ client: ClientRecord }> {
  const res = await fetch('/api/clients', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update client');
  }
  return res.json();
}

async function patchClientApi(clientId: string, updates: Record<string, unknown>): Promise<{ client: ClientRecord }> {
  const res = await fetch(`/api/clients?id=${clientId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update client');
  }
  return res.json();
}

async function deleteClientApi(clientId: string): Promise<void> {
  const res = await fetch(`/api/clients?id=${clientId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete client');
  }
}

export function useClients(userId: string | undefined) {
  return useQuery({
    queryKey: clientKeys.list(userId || ''),
    queryFn: fetchClients,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClientApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClientApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function usePatchClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, updates }: { clientId: string; updates: Record<string, unknown> }) =>
      patchClientApi(clientId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClientApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}
