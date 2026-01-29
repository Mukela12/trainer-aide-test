/**
 * Client-side Booking Service
 *
 * Uses API routes for booking CRUD operations (bypasses RLS via service role)
 */

import { SignOffMode } from '@/lib/types';

/**
 * Client info embedded in booking
 */
export interface BookingClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  credits: number | null;
}

/**
 * Service info embedded in booking
 */
export interface BookingService {
  id: string;
  name: string;
  duration: number;
  color: string;
  credits_required: number;
}

/**
 * Booking type definition
 */
export interface Booking {
  id: string;
  studioId: string | null;
  trainerId: string;
  clientId: string | null;
  serviceId: string | null;
  scheduledAt: string;
  duration: number;
  status: 'confirmed' | 'soft-hold' | 'checked-in' | 'completed' | 'cancelled' | 'no-show' | 'late';
  holdExpiry: string | null;
  sessionId: string | null;
  templateId: string | null;
  signOffMode: SignOffMode;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined data
  client: BookingClient | null;
  service: BookingService | null;
  clientName: string | null;
}

/**
 * Input type for creating a booking
 */
export interface CreateBookingInput {
  trainerId?: string;
  clientId?: string;
  serviceId?: string;
  scheduledAt: string;
  duration: number;
  status?: 'confirmed' | 'soft-hold';
  holdExpiry?: string;
  templateId?: string;
  signOffMode?: SignOffMode;
  notes?: string;
}

/**
 * Input type for updating a booking
 */
export interface UpdateBookingInput {
  clientId?: string;
  serviceId?: string;
  scheduledAt?: string;
  duration?: number;
  status?: 'confirmed' | 'soft-hold' | 'checked-in' | 'completed' | 'cancelled' | 'no-show' | 'late';
  holdExpiry?: string;
  sessionId?: string;
  templateId?: string;
  signOffMode?: SignOffMode;
  notes?: string;
}

/**
 * Database booking shape (snake_case)
 */
interface DbBooking {
  id: string;
  studio_id: string | null;
  trainer_id: string;
  client_id: string | null;
  service_id: string | null;
  scheduled_at: string;
  duration: number;
  status: string;
  hold_expiry: string | null;
  session_id: string | null;
  template_id: string | null;
  sign_off_mode: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client: BookingClient | null;
  service: BookingService | null;
  clientName?: string | null;
}

/**
 * Convert database booking to frontend format
 */
function dbToBooking(db: DbBooking): Booking {
  return {
    id: db.id,
    studioId: db.studio_id,
    trainerId: db.trainer_id,
    clientId: db.client_id,
    serviceId: db.service_id,
    scheduledAt: db.scheduled_at,
    duration: db.duration,
    status: db.status as Booking['status'],
    holdExpiry: db.hold_expiry,
    sessionId: db.session_id,
    templateId: db.template_id,
    signOffMode: (db.sign_off_mode || 'full_session') as SignOffMode,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    client: db.client,
    service: db.service,
    clientName: db.clientName || (db.client
      ? `${db.client.first_name || ''} ${db.client.last_name || ''}`.trim()
      : null),
  };
}

/**
 * Get bookings for a date range (client-side)
 * Uses API route to bypass RLS
 */
export async function getBookingsClient(
  trainerId: string,
  startDate: Date,
  endDate: Date,
  status?: string
): Promise<Booking[]> {
  try {
    const params = new URLSearchParams();
    params.set('startDate', startDate.toISOString());
    params.set('endDate', endDate.toISOString());
    if (status) {
      params.set('status', status);
    }

    const response = await fetch(`/api/bookings?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error fetching bookings:', error);
      return [];
    }

    const { bookings } = await response.json();
    return (bookings as DbBooking[]).map(dbToBooking);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

/**
 * Get a single booking by ID (client-side)
 */
export async function getBookingByIdClient(bookingId: string): Promise<Booking | null> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.json();
      console.error('Error fetching booking:', error);
      return null;
    }

    const { booking } = await response.json();
    return booking ? dbToBooking(booking as DbBooking) : null;
  } catch (error) {
    console.error('Error fetching booking:', error);
    return null;
  }
}

/**
 * Create a new booking (client-side)
 * Uses API route to bypass RLS
 */
export async function createBookingClient(input: CreateBookingInput): Promise<Booking | null> {
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trainerId: input.trainerId,
        clientId: input.clientId,
        serviceId: input.serviceId,
        scheduledAt: input.scheduledAt,
        duration: input.duration,
        status: input.status || 'confirmed',
        holdExpiry: input.holdExpiry,
        templateId: input.templateId,
        signOffMode: input.signOffMode || 'full_session',
        notes: input.notes,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error creating booking:', error);
      return null;
    }

    const { booking } = await response.json();
    return booking ? dbToBooking(booking as DbBooking) : null;
  } catch (error) {
    console.error('Error creating booking:', error);
    return null;
  }
}

/**
 * Update a booking (client-side)
 * Uses API route to bypass RLS
 */
export async function updateBookingClient(
  bookingId: string,
  updates: UpdateBookingInput
): Promise<Booking | null> {
  try {
    const response = await fetch('/api/bookings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: bookingId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error updating booking:', error);
      return null;
    }

    const { booking } = await response.json();
    return booking ? dbToBooking(booking as DbBooking) : null;
  } catch (error) {
    console.error('Error updating booking:', error);
    return null;
  }
}

/**
 * Cancel a booking (client-side)
 * Uses API route to bypass RLS
 */
export async function cancelBookingClient(bookingId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/bookings?id=${bookingId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error cancelling booking:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return false;
  }
}

/**
 * Check in a booking (client-side)
 * Uses API route to bypass RLS
 */
export async function checkInBookingClient(bookingId: string): Promise<Booking | null> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/check-in`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error checking in booking:', error);
      return null;
    }

    const { booking } = await response.json();
    return booking ? dbToBooking(booking as DbBooking) : null;
  } catch (error) {
    console.error('Error checking in booking:', error);
    return null;
  }
}

/**
 * Complete a booking and optionally create a session (client-side)
 * Uses API route to bypass RLS
 */
export async function completeBookingClient(
  bookingId: string,
  sessionData?: {
    createSession?: boolean;
    templateId?: string;
    blocks?: unknown[];
    notes?: string;
    startedAt?: string;
    completedAt?: string;
  }
): Promise<{ booking: Booking | null; session: unknown | null }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData || {}),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error completing booking:', error);
      return { booking: null, session: null };
    }

    const result = await response.json();
    return {
      booking: result.booking ? dbToBooking(result.booking as DbBooking) : null,
      session: result.session || null,
    };
  } catch (error) {
    console.error('Error completing booking:', error);
    return { booking: null, session: null };
  }
}

/**
 * Delete a booking permanently (client-side)
 * Uses API route to bypass RLS
 */
export async function deleteBookingClient(bookingId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}?hardDelete=true`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error deleting booking:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting booking:', error);
    return false;
  }
}
