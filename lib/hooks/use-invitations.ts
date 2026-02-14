'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Key factory
const invitationKeys = {
  all: ['invitations'] as const,
};

interface InviteResult {
  inviteUrl: string;
  emailSent: boolean;
  emailError?: string;
}

interface InviteInput {
  email: string;
  firstName?: string;
  lastName?: string;
  message?: string;
}

async function createInvitationApi(input: InviteInput): Promise<InviteResult> {
  const res = await fetch('/api/client-invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send invitation');
  }
  return {
    inviteUrl: data.inviteUrl,
    emailSent: data.emailSent,
    emailError: data.emailError,
  };
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvitationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

// --- Team Invitations (query + revoke) ---

export interface TeamInvitation {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

/** Fetches team invitations from /api/invitations */
export function useTeamInvitations() {
  return useQuery({
    queryKey: invitationKeys.all,
    queryFn: async (): Promise<TeamInvitation[]> => {
      const res = await fetch('/api/invitations');
      if (!res.ok) throw new Error('Failed to fetch invitations');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** DELETE /api/invitations?id=... */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/invitations?id=${invitationId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to revoke invitation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}

// --- Trainer/Team Invitation Create ---

interface InviteTrainerInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  message?: string | null;
  commissionPercent: number;
}

async function createTrainerInvitationApi(input: InviteTrainerInput): Promise<{ invitation: unknown; emailSent: boolean }> {
  const res = await fetch('/api/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to send invitation') as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data;
}

export function useInviteTrainer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTrainerInvitationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationKeys.all });
    },
  });
}
