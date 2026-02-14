"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getServicesClient,
  createServiceClient,
  updateServiceClient,
  deleteServiceClient,
  type Service as ApiService,
  type CreateServiceInput,
  type UpdateServiceInput,
} from "@/lib/services/service-service-client";
import type { Service } from "@/lib/types/service";

// --- Type converter ---

function toStoreService(apiService: ApiService): Service {
  return {
    id: apiService.id,
    name: apiService.name,
    description: apiService.description || "",
    duration: apiService.duration as Service["duration"],
    type: apiService.type,
    maxCapacity: apiService.maxCapacity,
    creditsRequired: apiService.creditsRequired,
    color: apiService.color,
    isActive: apiService.isActive,
    createdBy: apiService.createdBy,
    assignedStudios: apiService.studioId ? [apiService.studioId] : [],
    createdAt: apiService.createdAt,
    updatedAt: apiService.updatedAt,
  };
}

// --- Query key factory ---

export const serviceKeys = {
  all: ["services"] as const,
  list: (studioId?: string, activeOnly?: boolean) =>
    ["services", studioId, activeOnly] as const,
};

// --- Hooks ---

export function useServices(studioId?: string, activeOnly = true) {
  return useQuery({
    queryKey: serviceKeys.list(studioId, activeOnly),
    queryFn: async (): Promise<Service[]> => {
      const apiServices = await getServicesClient(studioId, activeOnly);
      return apiServices.map(toStoreService);
    },
  });
}

export function useAddService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceInput): Promise<Service | null> => {
      const apiService = await createServiceClient(input);
      return apiService ? toStoreService(apiService) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateServiceInput;
    }): Promise<Service | null> => {
      const apiService = await updateServiceClient(id, updates);
      return apiService ? toStoreService(apiService) : null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<boolean> => {
      return deleteServiceClient(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: serviceKeys.all });
      const previousQueries = queryClient.getQueriesData<Service[]>({
        queryKey: serviceKeys.all,
      });
      queryClient.setQueriesData<Service[]>(
        { queryKey: serviceKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((s: Service) =>
            s.id === id ? { ...s, isActive: false } : s
          );
        }
      );
      return { previousQueries };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}
