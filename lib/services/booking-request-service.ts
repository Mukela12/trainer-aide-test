/**
 * Booking Request Service
 *
 * Business logic for booking request operations.
 * Extracted from api/booking-requests route.
 * Email sending is NOT included here — the route handles that.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

// ── Types ───────────────────────────────────────────────────────────

export interface CreateBookingRequestInput {
  clientId?: string;
  client_id?: string;
  trainerId?: string;
  trainer_id?: string;
  serviceId?: string;
  service_id?: string;
  preferredTimes?: string[];
  preferred_times?: string[];
  notes?: string | null;
  expiresAt?: string;
  expires_at?: string;
}

export interface UpdateBookingRequestInput {
  id: string;
  status?: 'accepted' | 'declined' | 'pending' | 'expired';
  acceptedTime?: string;
  accepted_time?: string;
  notes?: string;
}

interface BookingRequestRow {
  id: string;
  studio_id: string;
  trainer_id: string;
  client_id: string;
  service_id: string | null;
  preferred_times: string[];
  notes: string | null;
  status: string;
  accepted_time?: string | null;
  booking_id?: string | null;
  expires_at: string;
  created_at: string;
  client?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    credits?: number | null;
  } | null;
  service?: {
    id: string;
    name?: string | null;
    duration?: number | null;
    color?: string | null;
    credits_required?: number | null;
  } | null;
  [key: string]: unknown;
}

const BOOKING_REQUEST_SELECT = `
  *,
  client:fc_clients(id, first_name, last_name, email, credits),
  service:ta_services(id, name, duration, color, credits_required)
`;

// ── Helpers ─────────────────────────────────────────────────────────

function addClientName(req: BookingRequestRow) {
  return {
    ...req,
    clientName: req.client
      ? `${req.client.first_name || ''} ${req.client.last_name || ''}`.trim()
      : null,
  };
}

// ── Service functions ───────────────────────────────────────────────

/**
 * Fetch booking requests for a user, filtered by trainer_id or studio_id.
 */
export async function getBookingRequests(
  userId: string,
  studioId: string,
  options?: { status?: string }
): Promise<{ data: BookingRequestRow[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from('ta_booking_requests')
      .select(BOOKING_REQUEST_SELECT)
      .or(`trainer_id.eq.${userId},studio_id.eq.${studioId}`)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching booking requests:', error);
      return { data: null, error: new Error(error.message) };
    }

    const transformed = (requests as BookingRequestRow[] || []).map(addClientName);
    return { data: transformed, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new booking request. Does NOT send emails.
 */
export async function createBookingRequest(
  studioId: string,
  userId: string,
  input: CreateBookingRequestInput
): Promise<{ data: BookingRequestRow | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Default expiry is 48 hours from now
    const defaultExpiry = new Date();
    defaultExpiry.setHours(defaultExpiry.getHours() + 48);

    const requestData = {
      studio_id: studioId,
      trainer_id: input.trainerId || input.trainer_id || userId,
      client_id: input.clientId || input.client_id,
      service_id: input.serviceId || input.service_id || null,
      preferred_times: input.preferredTimes || input.preferred_times,
      notes: input.notes || null,
      status: 'pending',
      expires_at: input.expiresAt || input.expires_at || defaultExpiry.toISOString(),
    };

    const { data, error } = await supabase
      .from('ta_booking_requests')
      .insert(requestData)
      .select(BOOKING_REQUEST_SELECT)
      .single();

    if (error) {
      console.error('Error creating booking request:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as BookingRequestRow, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a booking request (accept / decline / other status).
 * When accepting, creates a confirmed booking in ta_bookings.
 * Does NOT send emails.
 */
export async function updateBookingRequest(
  requestId: string,
  studioId: string,
  userId: string,
  input: UpdateBookingRequestInput
): Promise<{
  data: { request: BookingRequestRow; booking: Record<string, unknown> | null } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Fetch the existing request
    const { data: existingRequest, error: fetchError } = await supabase
      .from('ta_booking_requests')
      .select(BOOKING_REQUEST_SELECT)
      .eq('id', requestId)
      .single();

    if (fetchError || !existingRequest) {
      return { data: null, error: new Error('Booking request not found') };
    }

    const existing = existingRequest as BookingRequestRow;
    const updateData: Record<string, unknown> = {};
    let createdBooking: Record<string, unknown> | null = null;

    // Handle accept action
    if (input.status === 'accepted') {
      const acceptedTime = input.acceptedTime || input.accepted_time;
      if (!acceptedTime) {
        return {
          data: null,
          error: new Error('acceptedTime is required when accepting a request'),
        };
      }

      const bookingData = {
        studio_id: studioId,
        trainer_id: existing.trainer_id || userId,
        client_id: existing.client_id,
        service_id: existing.service_id,
        scheduled_at: acceptedTime,
        duration: existing.service?.duration || 60,
        status: 'confirmed',
        notes: existing.notes,
      };

      const { data: booking, error: bookingError } = await supabase
        .from('ta_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking from request:', bookingError);
        return { data: null, error: new Error(bookingError.message) };
      }

      createdBooking = booking as Record<string, unknown>;
      updateData.status = 'accepted';
      updateData.accepted_time = acceptedTime;
      updateData.booking_id = (booking as Record<string, unknown>).id;
    } else if (input.status === 'declined') {
      updateData.status = 'declined';
    } else if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    const { data: updated, error } = await supabase
      .from('ta_booking_requests')
      .update(updateData)
      .eq('id', requestId)
      .select(BOOKING_REQUEST_SELECT)
      .single();

    if (error) {
      console.error('Error updating booking request:', error);
      return { data: null, error: new Error(error.message) };
    }

    return {
      data: { request: updated as BookingRequestRow, booking: createdBooking },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete a booking request.
 */
export async function deleteBookingRequest(
  requestId: string
): Promise<{ data: { success: boolean } | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('ta_booking_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Error deleting booking request:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
