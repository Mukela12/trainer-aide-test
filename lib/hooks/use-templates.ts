"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTemplatesClient,
  createTemplateClient,
  updateTemplateClient,
  deleteTemplateClient,
  duplicateTemplateClient,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from "@/lib/services/template-service-client";
import type { WorkoutTemplate } from "@/lib/types";

// --- Query key factory ---

export const templateKeys = {
  all: ["templates"] as const,
  list: (userId?: string, studioId?: string | null) =>
    ["templates", userId, studioId] as const,
};

// --- Hooks ---

export function useTemplates(userId?: string, studioId?: string | null) {
  return useQuery({
    queryKey: templateKeys.list(userId, studioId),
    queryFn: () => getTemplatesClient(userId!, studioId),
    enabled: !!userId,
  });
}

export function useAddTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplateClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTemplateInput;
    }) => updateTemplateClient(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.all });
      const previousQueries = queryClient.getQueriesData<WorkoutTemplate[]>({
        queryKey: templateKeys.all,
      });
      queryClient.setQueriesData<WorkoutTemplate[]>(
        { queryKey: templateKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((t: WorkoutTemplate) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          );
        }
      );
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => deleteTemplateClient(templateId),
    onMutate: async (templateId) => {
      await queryClient.cancelQueries({ queryKey: templateKeys.all });
      const previousQueries = queryClient.getQueriesData<WorkoutTemplate[]>({
        queryKey: templateKeys.all,
      });
      queryClient.setQueriesData<WorkoutTemplate[]>(
        { queryKey: templateKeys.all },
        (old) => {
          if (!old) return old;
          return old.filter((t: WorkoutTemplate) => t.id !== templateId);
        }
      );
      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useDuplicateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => duplicateTemplateClient(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// --- Available Templates (for a specific client) ---

export interface AvailableTemplate {
  template_id: string;
  template_name: string;
  source: "trainer_toolkit" | "client_specific" | "own_template";
}

export interface GroupedTemplates {
  trainerToolkit: AvailableTemplate[];
  clientSpecific: AvailableTemplate[];
  ownTemplates: AvailableTemplate[];
}

interface AvailableTemplatesResponse {
  templates: AvailableTemplate[];
  grouped: GroupedTemplates;
  aiPrograms: Array<{
    id: string;
    program_name: string;
    description: string | null;
    primary_goal: string;
    experience_level: string;
    total_weeks: number;
    sessions_per_week: number;
  }>;
}

/** Fetches available templates for a specific client from /api/clients/:id/available-templates */
export function useAvailableTemplates(clientId: string | undefined) {
  return useQuery({
    queryKey: ["available-templates", clientId] as const,
    queryFn: async (): Promise<AvailableTemplatesResponse> => {
      const res = await fetch(`/api/clients/${clientId}/available-templates`);
      if (!res.ok) throw new Error("Failed to fetch available templates");
      const data = await res.json();
      return {
        templates: data.templates || [],
        grouped: data.grouped || {
          trainerToolkit: [],
          clientSpecific: [],
          ownTemplates: [],
        },
        aiPrograms: data.aiPrograms || [],
      };
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });
}
