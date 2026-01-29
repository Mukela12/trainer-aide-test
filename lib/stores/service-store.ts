import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Service } from '@/lib/types/service';
import {
  getServicesClient,
  createServiceClient,
  updateServiceClient,
  deleteServiceClient,
  CreateServiceInput,
  UpdateServiceInput,
} from '@/lib/services/service-service-client';

interface ServiceState {
  services: Service[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasFetched: boolean;

  // Fetch from database
  fetchServices: (studioId?: string, activeOnly?: boolean) => Promise<void>;

  // CRUD operations
  addService: (input: CreateServiceInput) => Promise<Service | null>;
  updateService: (id: string, updates: UpdateServiceInput) => Promise<Service | null>;
  deleteService: (id: string) => Promise<boolean>;

  // Getters
  getServiceById: (id: string) => Service | undefined;
  getActiveServices: () => Service[];

  // Reset
  reset: () => void;
  clearError: () => void;
}

// Convert API service to store Service type
function toStoreService(apiService: {
  id: string;
  studioId: string | null;
  name: string;
  description: string | null;
  duration: number;
  type: '1-2-1' | 'duet' | 'group';
  maxCapacity: number;
  creditsRequired: number;
  color: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}): Service {
  return {
    id: apiService.id,
    name: apiService.name,
    description: apiService.description || '',
    duration: apiService.duration as Service['duration'],
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

export const useServiceStore = create<ServiceState>()(
  persist(
    (set, get) => ({
      services: [],
      isLoading: false,
      isSaving: false,
      error: null,
      hasFetched: false,

      fetchServices: async (studioId?: string, activeOnly = true) => {
        // Prevent duplicate fetches
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const apiServices = await getServicesClient(studioId, activeOnly);
          const services = apiServices.map(toStoreService);
          set({ services, isLoading: false, hasFetched: true });
        } catch (error) {
          console.error('Error fetching services:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch services',
            isLoading: false,
          });
        }
      },

      addService: async (input: CreateServiceInput) => {
        set({ isSaving: true, error: null });
        try {
          const apiService = await createServiceClient(input);
          if (apiService) {
            const service = toStoreService(apiService);
            set((state) => ({
              services: [...state.services, service],
              isSaving: false,
            }));
            return service;
          }
          set({ isSaving: false, error: 'Failed to create service' });
          return null;
        } catch (error) {
          console.error('Error creating service:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create service',
            isSaving: false,
          });
          return null;
        }
      },

      updateService: async (id: string, updates: UpdateServiceInput) => {
        set({ isSaving: true, error: null });

        // Optimistic update
        const previousServices = get().services;
        set((state) => ({
          services: state.services.map((service) =>
            service.id === id
              ? { ...service, ...updates, updatedAt: new Date().toISOString() }
              : service
          ),
        }));

        try {
          const apiService = await updateServiceClient(id, updates);
          if (apiService) {
            const service = toStoreService(apiService);
            set((state) => ({
              services: state.services.map((s) => (s.id === id ? service : s)),
              isSaving: false,
            }));
            return service;
          }
          // Revert on failure
          set({ services: previousServices, isSaving: false, error: 'Failed to update service' });
          return null;
        } catch (error) {
          console.error('Error updating service:', error);
          set({
            services: previousServices,
            error: error instanceof Error ? error.message : 'Failed to update service',
            isSaving: false,
          });
          return null;
        }
      },

      deleteService: async (id: string) => {
        set({ isSaving: true, error: null });

        // Optimistic update - mark as inactive
        const previousServices = get().services;
        set((state) => ({
          services: state.services.map((service) =>
            service.id === id ? { ...service, isActive: false } : service
          ),
        }));

        try {
          const success = await deleteServiceClient(id);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          // Revert on failure
          set({ services: previousServices, isSaving: false, error: 'Failed to delete service' });
          return false;
        } catch (error) {
          console.error('Error deleting service:', error);
          set({
            services: previousServices,
            error: error instanceof Error ? error.message : 'Failed to delete service',
            isSaving: false,
          });
          return false;
        }
      },

      getServiceById: (id: string) => {
        return get().services.find((service) => service.id === id);
      },

      getActiveServices: () => {
        return get().services.filter((service) => service.isActive);
      },

      reset: () => set({ services: [], hasFetched: false, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'trainer-aide-services',
      partialize: (state) => ({
        services: state.services,
        hasFetched: state.hasFetched,
      }),
    }
  )
);
