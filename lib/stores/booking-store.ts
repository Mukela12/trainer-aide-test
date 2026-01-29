import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SignOffMode } from '@/lib/types';
import {
  getBookingsClient,
  createBookingClient,
  updateBookingClient,
  cancelBookingClient,
  checkInBookingClient,
  completeBookingClient,
  deleteBookingClient,
  Booking,
  CreateBookingInput,
  UpdateBookingInput,
} from '@/lib/services/booking-service-client';

// Re-export Booking type for convenience
export type { Booking };

// Mapped type for UI compatibility with legacy CalendarSession
export interface CalendarSession {
  id: string;
  datetime: Date;
  clientId: string | null;
  clientName: string | null;
  clientAvatar?: string;
  clientColor?: string;
  clientCredits?: number;
  status: 'upcoming' | 'confirmed' | 'checked-in' | 'soft-hold' | 'no-show' | 'late' | 'cancelled' | 'completed';
  serviceTypeId: string | null;
  workoutId?: string | null;
  templateId?: string | null;
  signOffMode?: SignOffMode;
  notes?: string;
  holdExpiry?: Date | null;
  // Additional fields from Booking
  trainerId?: string;
  duration?: number;
}

interface BookingState {
  bookings: Booking[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasFetched: boolean;
  currentDateRange: { start: Date; end: Date } | null;

  // Legacy compatibility - sessions as computed CalendarSession array
  sessions: CalendarSession[];

  // Fetch from database
  fetchBookings: (trainerId: string, startDate: Date, endDate: Date) => Promise<void>;
  initializeSessions: () => void; // Legacy no-op for compatibility

  // CRUD operations
  addBooking: (input: CreateBookingInput) => Promise<Booking | null>;
  updateBooking: (id: string, updates: UpdateBookingInput) => Promise<Booking | null>;
  cancelBooking: (id: string) => Promise<boolean>;
  deleteBooking: (id: string) => Promise<boolean>;

  // Status operations
  checkInBooking: (id: string) => Promise<Booking | null>;
  completeBooking: (id: string, sessionData?: Record<string, unknown>) => Promise<{ booking: Booking | null; session: unknown | null }>;

  // Legacy compatibility (maps to CalendarSession)
  getSessions: () => CalendarSession[];
  getSessionById: (id: string) => CalendarSession | undefined;
  getSessionsByDate: (date: Date) => CalendarSession[];
  addSession: (session: CalendarSession) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<CalendarSession>) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;

  // Getters
  getBookingById: (id: string) => Booking | undefined;
  getBookingsByDate: (date: Date) => Booking[];
  getBookingsByStatus: (status: string) => Booking[];
  getPendingHolds: () => Booking[];

  // Reset
  reset: () => void;
  clearError: () => void;
}

// Convert Booking to CalendarSession for legacy UI compatibility
function bookingToSession(booking: Booking): CalendarSession {
  return {
    id: booking.id,
    datetime: new Date(booking.scheduledAt),
    clientId: booking.clientId,
    clientName: booking.clientName,
    clientColor: booking.service?.color,
    clientCredits: booking.client?.credits ?? undefined,
    status: booking.status as CalendarSession['status'],
    serviceTypeId: booking.serviceId,
    templateId: booking.templateId,
    signOffMode: booking.signOffMode,
    notes: booking.notes ?? undefined,
    holdExpiry: booking.holdExpiry ? new Date(booking.holdExpiry) : null,
    trainerId: booking.trainerId,
    duration: booking.duration,
  };
}

// Convert CalendarSession input to CreateBookingInput
function sessionToBookingInput(session: CalendarSession): CreateBookingInput {
  return {
    clientId: session.clientId ?? undefined,
    serviceId: session.serviceTypeId ?? undefined,
    scheduledAt: session.datetime.toISOString(),
    duration: session.duration || 60,
    status: session.status === 'soft-hold' ? 'soft-hold' : 'confirmed',
    holdExpiry: session.holdExpiry?.toISOString(),
    templateId: session.templateId ?? undefined,
    signOffMode: session.signOffMode,
    notes: session.notes,
  };
}

// Helper to compute sessions from bookings
function computeSessions(bookings: Booking[]): CalendarSession[] {
  return bookings.map(bookingToSession);
}


export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      bookings: [],
      sessions: [], // Will be kept in sync with bookings
      isLoading: false,
      isSaving: false,
      error: null,
      hasFetched: false,
      currentDateRange: null,

      // Legacy no-op for compatibility
      initializeSessions: () => {
        // Data is now fetched from API via StoreInitializer
        // This is a no-op for backwards compatibility
      },

      fetchBookings: async (trainerId: string, startDate: Date, endDate: Date) => {
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const bookings = await getBookingsClient(trainerId, startDate, endDate);
          set({
            bookings,
            sessions: computeSessions(bookings),
            isLoading: false,
            hasFetched: true,
            currentDateRange: { start: startDate, end: endDate },
          });
        } catch (error) {
          console.error('Error fetching bookings:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch bookings',
            isLoading: false,
          });
        }
      },

      addBooking: async (input: CreateBookingInput) => {
        set({ isSaving: true, error: null });
        try {
          const booking = await createBookingClient(input);
          if (booking) {
            set((state) => {
              const newBookings = [...state.bookings, booking];
              return {
                bookings: newBookings,
                sessions: computeSessions(newBookings),
                isSaving: false,
              };
            });
            return booking;
          }
          set({ isSaving: false, error: 'Failed to create booking' });
          return null;
        } catch (error) {
          console.error('Error creating booking:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to create booking',
            isSaving: false,
          });
          return null;
        }
      },

      updateBooking: async (id: string, updates: UpdateBookingInput) => {
        set({ isSaving: true, error: null });

        const previousBookings = get().bookings;
        // Optimistic update
        set((state) => {
          const newBookings = state.bookings.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          );
          return { bookings: newBookings, sessions: computeSessions(newBookings) };
        });

        try {
          const booking = await updateBookingClient(id, updates);
          if (booking) {
            set((state) => {
              const newBookings = state.bookings.map((b) => (b.id === id ? booking : b));
              return { bookings: newBookings, sessions: computeSessions(newBookings), isSaving: false };
            });
            return booking;
          }
          set({ bookings: previousBookings, sessions: computeSessions(previousBookings), isSaving: false, error: 'Failed to update booking' });
          return null;
        } catch (error) {
          console.error('Error updating booking:', error);
          set({
            bookings: previousBookings,
            sessions: computeSessions(previousBookings),
            error: error instanceof Error ? error.message : 'Failed to update booking',
            isSaving: false,
          });
          return null;
        }
      },

      cancelBooking: async (id: string) => {
        set({ isSaving: true, error: null });

        const previousBookings = get().bookings;
        set((state) => {
          const newBookings = state.bookings.map((b) =>
            b.id === id ? { ...b, status: 'cancelled' as const } : b
          );
          return { bookings: newBookings, sessions: computeSessions(newBookings) };
        });

        try {
          const success = await cancelBookingClient(id);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          set({ bookings: previousBookings, sessions: computeSessions(previousBookings), isSaving: false, error: 'Failed to cancel booking' });
          return false;
        } catch (error) {
          console.error('Error cancelling booking:', error);
          set({
            bookings: previousBookings,
            sessions: computeSessions(previousBookings),
            error: error instanceof Error ? error.message : 'Failed to cancel booking',
            isSaving: false,
          });
          return false;
        }
      },

      deleteBooking: async (id: string) => {
        set({ isSaving: true, error: null });

        const previousBookings = get().bookings;
        set((state) => {
          const newBookings = state.bookings.filter((b) => b.id !== id);
          return { bookings: newBookings, sessions: computeSessions(newBookings) };
        });

        try {
          const success = await deleteBookingClient(id);
          if (success) {
            set({ isSaving: false });
            return true;
          }
          set({ bookings: previousBookings, sessions: computeSessions(previousBookings), isSaving: false, error: 'Failed to delete booking' });
          return false;
        } catch (error) {
          console.error('Error deleting booking:', error);
          set({
            bookings: previousBookings,
            sessions: computeSessions(previousBookings),
            error: error instanceof Error ? error.message : 'Failed to delete booking',
            isSaving: false,
          });
          return false;
        }
      },

      checkInBooking: async (id: string) => {
        set({ isSaving: true, error: null });

        const previousBookings = get().bookings;
        set((state) => {
          const newBookings = state.bookings.map((b) =>
            b.id === id ? { ...b, status: 'checked-in' as const } : b
          );
          return { bookings: newBookings, sessions: computeSessions(newBookings) };
        });

        try {
          const booking = await checkInBookingClient(id);
          if (booking) {
            set((state) => {
              const newBookings = state.bookings.map((b) => (b.id === id ? booking : b));
              return { bookings: newBookings, sessions: computeSessions(newBookings), isSaving: false };
            });
            return booking;
          }
          set({ bookings: previousBookings, sessions: computeSessions(previousBookings), isSaving: false, error: 'Failed to check in booking' });
          return null;
        } catch (error) {
          console.error('Error checking in booking:', error);
          set({
            bookings: previousBookings,
            sessions: computeSessions(previousBookings),
            error: error instanceof Error ? error.message : 'Failed to check in booking',
            isSaving: false,
          });
          return null;
        }
      },

      completeBooking: async (id: string, sessionData?: Record<string, unknown>) => {
        set({ isSaving: true, error: null });

        const previousBookings = get().bookings;
        set((state) => {
          const newBookings = state.bookings.map((b) =>
            b.id === id ? { ...b, status: 'completed' as const } : b
          );
          return { bookings: newBookings, sessions: computeSessions(newBookings) };
        });

        try {
          const result = await completeBookingClient(id, sessionData);
          if (result.booking) {
            set((state) => {
              const newBookings = state.bookings.map((b) => (b.id === id ? result.booking! : b));
              return { bookings: newBookings, sessions: computeSessions(newBookings), isSaving: false };
            });
            return result;
          }
          set({ bookings: previousBookings, sessions: computeSessions(previousBookings), isSaving: false, error: 'Failed to complete booking' });
          return { booking: null, session: null };
        } catch (error) {
          console.error('Error completing booking:', error);
          set({
            bookings: previousBookings,
            sessions: computeSessions(previousBookings),
            error: error instanceof Error ? error.message : 'Failed to complete booking',
            isSaving: false,
          });
          return { booking: null, session: null };
        }
      },

      // Legacy compatibility methods
      getSessions: () => {
        return get().bookings.map(bookingToSession);
      },

      getSessionById: (id: string) => {
        const booking = get().bookings.find((b) => b.id === id);
        return booking ? bookingToSession(booking) : undefined;
      },

      getSessionsByDate: (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get()
          .bookings.filter((b) => {
            const bookingDate = new Date(b.scheduledAt);
            return bookingDate >= startOfDay && bookingDate <= endOfDay;
          })
          .map(bookingToSession);
      },

      addSession: async (session: CalendarSession) => {
        const input = sessionToBookingInput(session);
        await get().addBooking(input);
      },

      updateSession: async (sessionId: string, updates: Partial<CalendarSession>) => {
        const updateInput: UpdateBookingInput = {};
        if (updates.clientId !== undefined) updateInput.clientId = updates.clientId ?? undefined;
        if (updates.serviceTypeId !== undefined) updateInput.serviceId = updates.serviceTypeId ?? undefined;
        if (updates.datetime !== undefined) updateInput.scheduledAt = updates.datetime.toISOString();
        if (updates.duration !== undefined) updateInput.duration = updates.duration;
        if (updates.status !== undefined && updates.status !== 'upcoming') {
          updateInput.status = updates.status;
        }
        if (updates.templateId !== undefined) updateInput.templateId = updates.templateId ?? undefined;
        if (updates.signOffMode !== undefined) updateInput.signOffMode = updates.signOffMode;
        if (updates.notes !== undefined) updateInput.notes = updates.notes;
        if (updates.holdExpiry !== undefined) {
          updateInput.holdExpiry = updates.holdExpiry?.toISOString();
        }

        await get().updateBooking(sessionId, updateInput);
      },

      removeSession: async (sessionId: string) => {
        await get().cancelBooking(sessionId);
      },

      // Native getters
      getBookingById: (id: string) => {
        return get().bookings.find((b) => b.id === id);
      },

      getBookingsByDate: (date: Date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get().bookings.filter((b) => {
          const bookingDate = new Date(b.scheduledAt);
          return bookingDate >= startOfDay && bookingDate <= endOfDay;
        });
      },

      getBookingsByStatus: (status: string) => {
        return get().bookings.filter((b) => b.status === status);
      },

      getPendingHolds: () => {
        const now = new Date();
        return get().bookings.filter((b) => {
          if (b.status !== 'soft-hold') return false;
          if (!b.holdExpiry) return true;
          return new Date(b.holdExpiry) > now;
        });
      },

      reset: () => set({ bookings: [], sessions: [], hasFetched: false, error: null, currentDateRange: null }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'trainer-aide-bookings',
      partialize: (state) => ({
        bookings: state.bookings,
        hasFetched: state.hasFetched,
        currentDateRange: state.currentDateRange,
      }),
      // Custom storage to properly handle Date serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          try {
            const { state } = JSON.parse(str);
            return { state };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);

// Also export the legacy store name for backwards compatibility
export const useCalendarStore = useBookingStore;
