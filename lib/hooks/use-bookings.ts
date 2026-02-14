"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBookingsClient,
  createBookingClient,
  updateBookingClient,
  cancelBookingClient,
  checkInBookingClient,
  completeBookingClient,
  deleteBookingClient,
  type Booking,
  type CreateBookingInput,
  type UpdateBookingInput,
} from "@/lib/services/booking-service-client";
import type { SignOffMode } from "@/lib/types";

export type { Booking, CreateBookingInput, UpdateBookingInput };

// --- CalendarSession type for legacy UI compatibility ---

export interface CalendarSession {
  id: string;
  datetime: Date;
  clientId: string | null;
  clientName: string | null;
  clientAvatar?: string;
  clientColor?: string;
  clientCredits?: number;
  status:
    | "upcoming"
    | "confirmed"
    | "checked-in"
    | "soft-hold"
    | "no-show"
    | "late"
    | "cancelled"
    | "completed";
  serviceTypeId: string | null;
  workoutId?: string | null;
  templateId?: string | null;
  signOffMode?: SignOffMode;
  notes?: string;
  holdExpiry?: Date | null;
  trainerId?: string;
  duration?: number;
}

// --- Converters ---

function bookingToSession(booking: Booking): CalendarSession {
  return {
    id: booking.id,
    datetime: new Date(booking.scheduledAt),
    clientId: booking.clientId,
    clientName: booking.clientName,
    clientColor: booking.service?.color,
    clientCredits: booking.client?.credits ?? undefined,
    status: booking.status as CalendarSession["status"],
    serviceTypeId: booking.serviceId,
    templateId: booking.templateId,
    signOffMode: booking.signOffMode,
    notes: booking.notes ?? undefined,
    holdExpiry: booking.holdExpiry ? new Date(booking.holdExpiry) : null,
    trainerId: booking.trainerId,
    duration: booking.duration,
  };
}

function sessionToBookingInput(session: CalendarSession): CreateBookingInput {
  return {
    clientId: session.clientId ?? undefined,
    serviceId: session.serviceTypeId ?? undefined,
    scheduledAt: session.datetime.toISOString(),
    duration: session.duration || 60,
    status: session.status === "soft-hold" ? "soft-hold" : "confirmed",
    holdExpiry: session.holdExpiry?.toISOString(),
    templateId: session.templateId ?? undefined,
    signOffMode: session.signOffMode,
    notes: session.notes,
  };
}

// --- Query key factory ---

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (trainerId?: string) => ["bookings", trainerId] as const,
};

// --- Hooks ---

export function useBookings(trainerId?: string) {
  const query = useQuery({
    queryKey: bookingKeys.list(trainerId),
    queryFn: async () => {
      // Fetch a wide date range (current month ± 1 month)
      const now = new Date();
      const startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(now);
      endDate.setMonth(now.getMonth() + 2);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);
      return getBookingsClient(trainerId!, startDate, endDate);
    },
    enabled: !!trainerId,
  });

  // Compute CalendarSession array from bookings for legacy UI compat
  const sessions = useMemo(
    () => (query.data ?? []).map(bookingToSession),
    [query.data]
  );

  return { ...query, sessions };
}

export function useAddBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBookingClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

/** Legacy-compatible: accepts a CalendarSession, converts to CreateBookingInput */
export function useAddSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (session: CalendarSession) =>
      createBookingClient(sessionToBookingInput(session)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateBookingInput;
    }) => updateBookingClient(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.all });
      const previousQueries = queryClient.getQueriesData<Booking[]>({
        queryKey: bookingKeys.all,
      });
      queryClient.setQueriesData<Booking[]>(
        { queryKey: bookingKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((b: Booking) =>
            b.id === id ? { ...b, ...updates } : b
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
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

/** Legacy-compatible: accepts CalendarSession partial, converts to UpdateBookingInput */
export function useUpdateSession() {
  const updateBooking = useUpdateBooking();

  return {
    ...updateBooking,
    mutate: (
      sessionId: string,
      updates: Partial<CalendarSession>
    ) => {
      const updateInput: UpdateBookingInput = {};
      if (updates.clientId !== undefined)
        updateInput.clientId = updates.clientId ?? undefined;
      if (updates.serviceTypeId !== undefined)
        updateInput.serviceId = updates.serviceTypeId ?? undefined;
      if (updates.datetime !== undefined)
        updateInput.scheduledAt = updates.datetime.toISOString();
      if (updates.duration !== undefined)
        updateInput.duration = updates.duration;
      if (updates.status !== undefined && updates.status !== "upcoming") {
        updateInput.status = updates.status;
      }
      if (updates.templateId !== undefined)
        updateInput.templateId = updates.templateId ?? undefined;
      if (updates.signOffMode !== undefined)
        updateInput.signOffMode = updates.signOffMode;
      if (updates.notes !== undefined) updateInput.notes = updates.notes;
      if (updates.holdExpiry !== undefined) {
        updateInput.holdExpiry = updates.holdExpiry?.toISOString();
      }
      updateBooking.mutate({ id: sessionId, updates: updateInput });
    },
  };
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelBookingClient(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.all });
      const previousQueries = queryClient.getQueriesData<Booking[]>({
        queryKey: bookingKeys.all,
      });
      queryClient.setQueriesData<Booking[]>(
        { queryKey: bookingKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((b: Booking) =>
            b.id === id ? { ...b, status: "cancelled" as const } : b
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
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteBookingClient(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: bookingKeys.all });
      const previousQueries = queryClient.getQueriesData<Booking[]>({
        queryKey: bookingKeys.all,
      });
      queryClient.setQueriesData<Booking[]>(
        { queryKey: bookingKeys.all },
        (old) => {
          if (!old) return old;
          return old.filter((b: Booking) => b.id !== id);
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
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useCheckInBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => checkInBookingClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

export function useCompleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      sessionData,
    }: {
      id: string;
      sessionData?: Record<string, unknown>;
    }) => completeBookingClient(id, sessionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}
