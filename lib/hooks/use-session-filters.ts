import { useSessionStore } from '@/lib/stores/session-store';
import { useCalendarStore } from '@/lib/stores/booking-store';
import { useUserStore } from '@/lib/stores/user-store';
import { Session } from '@/lib/types';
import { CalendarSession } from '@/lib/types/calendar';

/**
 * Custom hooks for common session filtering operations
 * Eliminates duplicate filtering logic across components
 */

/**
 * Get completed sessions for current user
 */
export function useCompletedSessions(): Session[] {
  const sessions = useSessionStore((state) => state.sessions);
  const currentUserId = useUserStore((state) => state.currentUser.id);

  return sessions
    .filter((s) => s.completed && s.trainerId === currentUserId)
    .sort((a, b) => {
      const dateA = new Date(a.completedAt || 0).getTime();
      const dateB = new Date(b.completedAt || 0).getTime();
      return dateB - dateA; // Most recent first
    });
}

/**
 * Get in-progress sessions for current user
 */
export function useInProgressSessions(): Session[] {
  const sessions = useSessionStore((state) => state.sessions);
  const currentUserId = useUserStore((state) => state.currentUser.id);

  return sessions.filter((s) => !s.completed && s.trainerId === currentUserId);
}

/**
 * Get upcoming calendar sessions
 * @param limit - Optional limit for number of sessions (default: 5)
 */
export function useUpcomingSessions(limit: number = 5): CalendarSession[] {
  const calendarSessions = useCalendarStore((state) => state.sessions);
  const now = new Date();

  return calendarSessions
    .filter((s) => {
      const sessionDate = s.datetime instanceof Date ? s.datetime : new Date(s.datetime);
      return sessionDate > now;
    })
    .sort((a, b) => {
      const dateA = a.datetime instanceof Date ? a.datetime : new Date(a.datetime);
      const dateB = b.datetime instanceof Date ? b.datetime : new Date(b.datetime);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, limit);
}

/**
 * Get sessions from the past week
 */
export function useSessionsThisWeek(): Session[] {
  const sessions = useSessionStore((state) => state.sessions);
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  return sessions.filter(
    (s) => s.completed && new Date(s.startedAt) >= thisWeekStart
  );
}

/**
 * Get session statistics for current user
 */
export function useSessionStats() {
  const sessions = useSessionStore((state) => state.sessions);
  const currentUserId = useUserStore((state) => state.currentUser.id);

  const userSessions = sessions.filter((s) => s.trainerId === currentUserId);
  const completedSessions = userSessions.filter((s) => s.completed);
  const inProgressSessions = userSessions.filter((s) => !s.completed);

  // Sessions this week
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  const sessionsThisWeek = completedSessions.filter(
    (s) => new Date(s.startedAt) >= thisWeekStart
  );

  // Average RPE (only for sessions with RPE)
  const sessionsWithRpe = completedSessions.filter((s) => s.overallRpe);
  const averageRpe =
    sessionsWithRpe.length > 0
      ? Math.round(
          sessionsWithRpe.reduce((acc, s) => acc + (s.overallRpe || 0), 0) /
            sessionsWithRpe.length
        )
      : 0;

  return {
    total: userSessions.length,
    completed: completedSessions.length,
    inProgress: inProgressSessions.length,
    thisWeek: sessionsThisWeek.length,
    averageRpe,
  };
}
