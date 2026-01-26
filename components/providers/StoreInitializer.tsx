"use client";

import { useEffect, useRef } from 'react';
import { useSessionStore } from '@/lib/stores/session-store';
import { useTemplateStore } from '@/lib/stores/template-store';
import { useCalendarStore } from '@/lib/stores/calendar-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from './AuthProvider';

export function StoreInitializer() {
  const initializeCalendarSessions = useCalendarStore((state) => state.initializeSessions);

  // Use auth context to check if auth is ready
  const { user: authUser, isLoading: authLoading } = useAuth();

  const currentUser = useUserStore((state) => state.currentUser);
  const studioId = useUserStore((state) => state.studioId);
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);

  const fetchTemplates = useTemplateStore((state) => state.fetchTemplates);
  const fetchSessions = useSessionStore((state) => state.fetchSessions);

  // Track if we've already fetched to avoid duplicate calls
  const hasFetched = useRef(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    // Only fetch if authenticated and we have a user ID
    if (isAuthenticated && currentUser.id && !hasFetched.current) {
      hasFetched.current = true;

      // Fetch templates and sessions from Supabase
      // For solo practitioners, user_id acts as studio_id
      const effectiveStudioId = studioId || currentUser.id;

      fetchTemplates(currentUser.id, effectiveStudioId).catch(console.error);
      fetchSessions(currentUser.id).catch(console.error);

      // Calendar still uses mock data for now (TODO: integrate with booking system)
      initializeCalendarSessions();
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
    initializeCalendarSessions,
    fetchTemplates,
    fetchSessions,
  ]);

  return null;
}
