'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AIProgram, AIWorkout } from '@/lib/types/ai-program';

// --- Query key factory ---

export const aiProgramKeys = {
  all: ['ai-programs'] as const,
  list: () => ['ai-programs', 'list'] as const,
  templates: () => ['ai-programs', 'templates'] as const,
  assigned: () => ['ai-programs', 'assigned'] as const,
  detail: (id: string) => ['ai-programs', id] as const,
};

// --- Hooks ---

/** Fetches all AI programs from /api/ai-programs */
export function useAIPrograms() {
  return useQuery({
    queryKey: aiProgramKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/ai-programs');
      if (!res.ok) throw new Error('Failed to fetch programs');
      const data = await res.json();
      return (data.programs || []) as AIProgram[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches AI program templates from /api/ai-programs/templates */
export function useAIProgramTemplates() {
  return useQuery({
    queryKey: aiProgramKeys.templates(),
    queryFn: async () => {
      const res = await fetch('/api/ai-programs/templates');
      if (!res.ok) throw new Error('Failed to fetch AI templates');
      const data = await res.json();
      return (data.templates || []) as AIProgram[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches assigned AI programs from /api/ai-programs/assigned */
export function useAssignedAIPrograms() {
  return useQuery({
    queryKey: aiProgramKeys.assigned(),
    queryFn: async () => {
      const res = await fetch('/api/ai-programs/assigned');
      if (!res.ok) throw new Error('Failed to fetch assigned templates');
      const data = await res.json();
      return (data.templates || []) as AIProgram[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches a single AI program by ID from /api/ai-programs/:id */
export function useAIProgram(programId: string | undefined) {
  return useQuery({
    queryKey: aiProgramKeys.detail(programId || ''),
    queryFn: async () => {
      const res = await fetch(`/api/ai-programs/${programId}`);
      if (!res.ok) throw new Error(`Failed to fetch program: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return (data.program || data) as AIProgram;
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetches workouts for a program from /api/ai-programs/:id/workouts */
export function useWorkouts(programId: string | undefined) {
  return useQuery({
    queryKey: [...aiProgramKeys.detail(programId || ''), 'workouts'] as const,
    queryFn: async () => {
      const res = await fetch(`/api/ai-programs/${programId}/workouts`);
      if (!res.ok) throw new Error('Failed to fetch workouts');
      const data = await res.json();
      return (data.workouts || []) as AIWorkout[];
    },
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
  });
}

/** DELETE /api/ai-programs/:id */
export function useDeleteAIProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const res = await fetch(`/api/ai-programs/${programId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete program');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProgramKeys.all });
    },
  });
}

/** PATCH /api/ai-programs/:id (status updates, archive, etc.) */
export function usePatchAIProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, updates }: { programId: string; updates: Partial<AIProgram> | Record<string, unknown> }) => {
      const res = await fetch(`/api/ai-programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update program');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProgramKeys.all });
    },
  });
}

/** POST /api/ai-programs/:id/duplicate */
export function useDuplicateAIProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      const res = await fetch(`/api/ai-programs/${programId}/duplicate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to duplicate program');
      const data = await res.json();
      return data.program as AIProgram;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProgramKeys.all });
    },
  });
}

/** POST /api/ai-programs/:id/template (toggle is_template) */
export function useToggleAIProgramTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, isTemplate }: { programId: string; isTemplate: boolean }) => {
      const res = await fetch(`/api/ai-programs/${programId}/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_template: isTemplate }),
      });
      if (!res.ok) throw new Error('Failed to update template status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProgramKeys.all });
    },
  });
}

/** POST /api/ai-programs/:id/assign (supports both client and trainer assignment) */
export function useAssignAIProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, clientId, trainerId }: { programId: string; clientId?: string; trainerId?: string }) => {
      const body = clientId ? { client_id: clientId } : { trainer_id: trainerId };
      const res = await fetch(`/api/ai-programs/${programId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign program');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiProgramKeys.all });
    },
  });
}
