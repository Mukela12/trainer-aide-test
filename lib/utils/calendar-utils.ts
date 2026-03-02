// Utility functions for calendar operations

import { CalendarSession, ServiceType, TimeSlot } from '../types/calendar';

/**
 * Generate 15-minute time slots for a given date
 * Operating hours: 6am - 8pm (14 hours = 56 slots)
 */
export function generateTimeSlots(date: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const startHour = 6;
  const endHour = 20; // 8pm

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute of [0, 15, 30, 45]) {
      const datetime = new Date(date);
      datetime.setHours(hour, minute, 0, 0);

      slots.push({
        datetime,
        hour,
        minute,
        available: true, // Will be updated based on existing sessions
      });
    }
  }

  return slots;
}

/**
 * Check if a time slot is available (no conflicts with existing sessions)
 */
export function isTimeAvailable(
  datetime: Date,
  durationMinutes: number,
  sessions: CalendarSession[],
  excludeSessionId?: string
): boolean {
  const proposedEnd = new Date(datetime.getTime() + durationMinutes * 60000);

  return !sessions.some((session) => {
    if (excludeSessionId && session.id === excludeSessionId) return false;

    const sessionEnd = new Date(
      session.datetime.getTime() + getSessionDuration(session) * 60000
    );

    // Check for overlap
    return datetime < sessionEnd && proposedEnd > session.datetime;
  });
}

/**
 * Get session duration in minutes.
 * Uses the session's own duration field, or falls back to 30 minutes.
 */
export function getSessionDuration(session: CalendarSession & { duration?: number }): number {
  return session.duration || 30;
}

/**
 * Calculate session position and height for grid display
 * Used in week view for positioning sessions
 */
export function calculateSessionGridPosition(
  session: CalendarSession,
  duration: number
): { top: number; height: number } {
  const startHour = session.datetime.getHours();
  const startMinute = session.datetime.getMinutes();

  // Calculate position within hour blocks
  const hoursSinceStart = startHour - 6; // 6am is start
  const minuteOffset = startMinute;
  const topPosition = (hoursSinceStart * 60 + minuteOffset) * 2; // 2px per minute

  const heightPixels = duration * 2; // 2px per minute

  return { top: topPosition, height: heightPixels };
}

/**
 * Calculate session height in blocks (for 15-min interval grid)
 */
export function calculateSessionHeight(durationMinutes: number): {
  heightBlocks: number;
  heightPx: number;
} {
  const heightBlocks = Math.ceil(durationMinutes / 15);
  const heightPx = heightBlocks * 32; // 32px per 15-min block

  return { heightBlocks, heightPx };
}

/**
 * Format time remaining for soft-hold expiry
 */
export function getTimeRemaining(expiryDate: Date): string {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Get status badge styling based on session status
 */
export function getStatusBadge(status: string): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'soft-hold':
      return { bg: '#FFF3E0', text: '#F4B324', label: 'Soft Hold' };
    case 'confirmed':
      return { bg: '#E8F5E9', text: '#4CAF50', label: 'Confirmed' };
    case 'checked-in':
      return { bg: '#E3F2FD', text: '#2196F3', label: 'In Session' };
    case 'cancelled':
      return { bg: '#FCE4EC', text: '#E91E63', label: 'Cancelled' };
    case 'no-show':
      return { bg: '#FFEBEE', text: '#F44336', label: 'No Show' };
    case 'late':
      return { bg: '#FFF9C4', text: '#F57C00', label: 'Late' };
    case 'upcoming':
      return { bg: '#F3E5F5', text: '#9C27B0', label: 'Upcoming' };
    default:
      return { bg: '#F5F5F5', text: '#9E9E9E', label: status };
  }
}

/**
 * Check if a service type is a group session and return group color overrides
 */
export function getGroupColorOverride(serviceType: { type?: string }): { bg: string; border: string } | null {
  if (serviceType?.type === 'group') {
    return { bg: '#E3F2FD', border: '#2196F3' };
  }
  return null;
}

/**
 * Check if a status badge should be shown (hide "Confirmed" — only show non-obvious statuses)
 */
export function shouldShowStatusBadge(status: string): boolean {
  return status !== 'confirmed';
}

/**
 * Get week dates starting from Monday
 */
export function getWeekDates(currentDate: Date): Date[] {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1)); // Start on Monday
  startOfWeek.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
