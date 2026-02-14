"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBookingRequestsClient,
  createBookingRequestClient,
  acceptRequestClient,
  declineRequestClient,
  deleteBookingRequestClient,
  filterExpiredRequests,
  type BookingRequest,
  type CreateBookingRequestInput,
} from "@/lib/services/booking-request-service-client";

export type { BookingRequest, CreateBookingRequestInput };

// --- Query key factory ---

export const bookingRequestKeys = {
  all: ["booking-requests"] as const,
  list: (trainerId?: string, status?: string) =>
    ["booking-requests", trainerId, status] as const,
};

// --- Hooks ---

export function useBookingRequests(
  trainerId?: string,
  status?: "pending" | "accepted" | "declined" | "expired"
) {
  return useQuery({
    queryKey: bookingRequestKeys.list(trainerId, status),
    queryFn: () => getBookingRequestsClient(trainerId, status),
    enabled: !!trainerId,
  });
}

export function useCreateBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBookingRequestInput) =>
      createBookingRequestClient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all });
    },
  });
}

export function useAcceptBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      acceptedTime,
    }: {
      requestId: string;
      acceptedTime: string;
    }) => acceptRequestClient(requestId, acceptedTime),
    onMutate: async ({ requestId, acceptedTime }) => {
      await queryClient.cancelQueries({ queryKey: bookingRequestKeys.all });
      const previousQueries = queryClient.getQueriesData<BookingRequest[]>({
        queryKey: bookingRequestKeys.all,
      });
      queryClient.setQueriesData<BookingRequest[]>(
        { queryKey: bookingRequestKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((r: BookingRequest) =>
            r.id === requestId
              ? { ...r, status: "accepted" as const, acceptedTime }
              : r
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
      queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all });
    },
  });
}

export function useDeclineBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => declineRequestClient(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: bookingRequestKeys.all });
      const previousQueries = queryClient.getQueriesData<BookingRequest[]>({
        queryKey: bookingRequestKeys.all,
      });
      queryClient.setQueriesData<BookingRequest[]>(
        { queryKey: bookingRequestKeys.all },
        (old) => {
          if (!old) return old;
          return old.map((r: BookingRequest) =>
            r.id === requestId ? { ...r, status: "declined" as const } : r
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
      queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all });
    },
  });
}

export function useDeleteBookingRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) => deleteBookingRequestClient(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: bookingRequestKeys.all });
      const previousQueries = queryClient.getQueriesData<BookingRequest[]>({
        queryKey: bookingRequestKeys.all,
      });
      queryClient.setQueriesData<BookingRequest[]>(
        { queryKey: bookingRequestKeys.all },
        (old) => {
          if (!old) return old;
          return old.filter((r: BookingRequest) => r.id !== requestId);
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
      queryClient.invalidateQueries({ queryKey: bookingRequestKeys.all });
    },
  });
}

// --- Utility ---

export { filterExpiredRequests };
