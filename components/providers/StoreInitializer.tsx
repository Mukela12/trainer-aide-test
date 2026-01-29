"use client";

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/stores/session-store';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useBookingStore } from '@/lib/stores/booking-store';
import { useServiceStore } from '@/lib/stores/service-store';
import { useAvailabilityStore } from '@/lib/stores/availability-store';
import { useBookingRequestStore } from '@/lib/stores/booking-request-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from './AuthProvider';

export function StoreInitializer() {
  // Use auth context to check if auth is ready
  const { user: authUser, isLoading: authLoading } = useAuth();

  const currentUser = useUserStore((state) => state.currentUser);
  const studioId = useUserStore((state) => state.studioId);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  // Template and session store actions
  const fetchTemplates = useTemplateStore((state) => state.fetchTemplates);
  const fetchSessions = useSessionStore((state) => state.fetchSessions);

  // New store actions for database integration
  const fetchBookings = useBookingStore((state) => state.fetchBookings);
  const fetchServices = useServiceStore((state) => state.fetchServices);
  const fetchAvailability = useAvailabilityStore((state) => state.fetchAvailability);
  const fetchBookingRequests = useBookingRequestStore((state) => state.fetchRequests);

  // Track if we've already fetched to avoid duplicate calls
  const hasFetched = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Only fetch if authenticated and we have a user ID
    if (isAuthenticated && currentUser.id && !hasFetched.current) {
      hasFetched.current = true;

      // For solo practitioners, user_id acts as studio_id
      const effectiveStudioId = studioId || currentUser.id;

      // Fetch templates and sessions from Supabase
      fetchTemplates(currentUser.id, effectiveStudioId).catch(console.error);
      fetchSessions(currentUser.id).catch(console.error);

      // Fetch services from database (seeds defaults if none exist)
      fetchServices(effectiveStudioId).catch(console.error);

      // Fetch bookings for current week
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      fetchBookings(currentUser.id, startOfWeek, endOfWeek).catch(console.error);

      // Fetch trainer availability (seeds defaults if none exist)
      fetchAvailability(currentUser.id).catch(console.error);

      // Fetch pending booking requests
      fetchBookingRequests(currentUser.id, 'pending').catch(console.error);
    }

    // Reset fetch flag if user logs out
    if (!isAuthenticated) {
      hasFetched.current = false;
    }
  }, [
    authLoading,
    authUser,
    isAuthenticated,
    currentUser.id,
    studioId,
    fetchTemplates,
    fetchSessions,
    fetchBookings,
    fetchServices,
    fetchAvailability,
    fetchBookingRequests,
  ]);

  return null;
}
