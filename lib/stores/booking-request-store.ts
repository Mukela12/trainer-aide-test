// Booking Request Store - Manage booking requests from clients

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getBookingRequestsClient,
  getPendingRequestsClient,
  createBookingRequestClient,
  acceptRequestClient,
  declineRequestClient,
  deleteBookingRequestClient,
  filterExpiredRequests,
  BookingRequest,
  CreateBookingRequestInput,
} from '@/lib/services/booking-request-service-client';

// Re-export types
export type { BookingRequest, CreateBookingRequestInput };

interface BookingRequestState {
  requests: BookingRequest[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasFetched: boolean;

  // Fetch from database
  fetchRequests: (trainerId?: string, status?: 'pending' | 'accepted' | 'declined' | 'expired') => Promise<void>;
  fetchPendingRequests: (trainerId?: string) => Promise<void>;

  // CRUD operations
  createRequest: (input: CreateBookingRequestInput) => Promise<BookingRequest | null>;
  acceptRequest: (requestId: string, acceptedTime: string) => Promise<{ request: BookingRequest | null; booking: unknown | null }>;
  declineRequest: (requestId: string) => Promise<boolean>;
  deleteRequest: (requestId: string) => Promise<boolean>;

  // Getters
  getRequestById: (id: string) => BookingRequest | undefined;
  getPendingRequests: () => BookingRequest[];
  getExpiredRequests: () => BookingRequest[];
  getRequestsByClient: (clientId: string) => BookingRequest[];

  // Utility
  checkExpiredRequests: () => void;
  reset: () => void;
  clearError: () => void;
}

export const useBookingRequestStore = create<BookingRequestState>()(
  persist(
    (set, get) => ({
      requests: [],
      isLoading: false,
      isSaving: false,
      error: null,
      hasFetched: false,

      fetchRequests: async (trainerId?: string, status?: 'pending' | 'accepted' | 'declined' | 'expired') => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const requests = await getBookingRequestsClient(trainerId, status);
          set({ requests, isLoading: false, hasFetched: true });
        } catch (error) {
          console.error('Error fetching booking requests:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch requests',
            isLoading: false,
          });
        }
      },

      fetchPendingRequests: async (trainerId?: string) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const requests = await getPendingRequestsClient(trainerId);
          set({ requests, isLoading: false, hasFetched: true });
        } catch (error) {
          console.error('Error fetching pending requests:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch requests',
            isLoading: false,
          });
        }
      },

      createRequest: async (input: CreateBookingRequestInput) => {
        set({ isSaving: true, error: null });
        try {
          const request = await createBookingRequestClient(input);
          if (request) {
            set((state) => ({
              requests: [...state.requests, request],
              isSaving: false,
            }));
            return request;
          }
          set({ isSaving: false, error: 'Failed to create request' });
          return null;
        } catch (error) {
          console.error('Error creating booking request:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create request',
            isSaving: false,
          });
          return null;
        }
      },

      acceptRequest: async (requestId: string, acceptedTime: string) => {
        set({ isSaving: true, error: null });

        const previousRequests = get().requests;
        // Optimistic update
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === requestId ? { ...r, status: 'accepted' as const, acceptedTime } : r
          ),
        }));

        try {
          const result = await acceptRequestClient(requestId, acceptedTime);
          if (result.request) {
            set((state) => ({
              requests: state.requests.map((r) =>
                r.id === requestId ? result.request! : r
              ),
              isSaving: false,
            }));
            return result;
          }
          set({ requests: previousRequests, isSaving: false, error: 'Failed to accept request' });
          return { request: null, booking: null };
        } catch (error) {
          console.error('Error accepting request:', error);
          set({
            requests: previousRequests,
            error: error instanceof Error ? error.message : 'Failed to accept request',
            isSaving: false,
          });
          return { request: null, booking: null };
        }
      },

      declineRequest: async (requestId: string) => {
        set({ isSaving: true, error: null });

        const previousRequests = get().requests;
        // Optimistic update
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === requestId ? { ...r, status: 'declined' as const } : r
          ),
        }));

        try {
          const success = await declineRequestClient(requestId);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          set({ requests: previousRequests, isSaving: false, error: 'Failed to decline request' });
          return false;
        } catch (error) {
          console.error('Error declining request:', error);
          set({
            requests: previousRequests,
            error: error instanceof Error ? error.message : 'Failed to decline request',
            isSaving: false,
          });
          return false;
        }
      },

      deleteRequest: async (requestId: string) => {
        set({ isSaving: true, error: null });

        const previousRequests = get().requests;
        // Optimistic update
        set((state) => ({
          requests: state.requests.filter((r) => r.id !== requestId),
        }));

        try {
          const success = await deleteBookingRequestClient(requestId);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          set({ requests: previousRequests, isSaving: false, error: 'Failed to delete request' });
          return false;
        } catch (error) {
          console.error('Error deleting request:', error);
          set({
            requests: previousRequests,
            error: error instanceof Error ? error.message : 'Failed to delete request',
            isSaving: false,
          });
          return false;
        }
      },

      getRequestById: (id: string) => {
        return get().requests.find((r) => r.id === id);
      },

      getPendingRequests: () => {
        const now = new Date();
        return get().requests.filter((r) => {
          if (r.status !== 'pending') return false;
          const expiresAt = new Date(r.expiresAt);
          return expiresAt > now;
        });
      },

      getExpiredRequests: () => {
        const now = new Date();
        return get().requests.filter((r) => {
          if (r.status !== 'pending') return false;
          const expiresAt = new Date(r.expiresAt);
          return expiresAt <= now;
        });
      },

      getRequestsByClient: (clientId: string) => {
        return get().requests.filter((r) => r.clientId === clientId);
      },

      checkExpiredRequests: () => {
        const { pending, expired } = filterExpiredRequests(get().requests);
        if (expired.length > 0) {
          // Update local state to reflect expired requests
          set((state) => ({
            requests: state.requests.map((r) => {
              const isExpired = expired.find((e) => e.id === r.id);
              return isExpired ? { ...r, status: 'expired' as const } : r;
            }),
          }));
        }
      },

      reset: () => set({ requests: [], hasFetched: false, error: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'trainer-aide-booking-requests',
      partialize: (state) => ({
        requests: state.requests,
        hasFetched: state.hasFetched,
      }),
    }
  )
);
