/**
 * Booking Service
 *
 * Business logic for booking operations.
 * Extracted from api/bookings, api/public/book, and api/bookings/[id]/complete routes.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendBookingConfirmationEmail, queueNotification } from '@/lib/notifications/email-service';
import { getStudioConfig, isWithinOpeningHours } from '@/lib/services/studio-service';

/**
 * Check for booking time conflicts with existing bookings.
 */
export async function checkBookingConflicts(
  trainerId: string,
  scheduledAt: string,
  durationMinutes: number
): Promise<{ hasConflict: boolean; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();
    const scheduledDate = new Date(scheduledAt);
    const endTime = new Date(scheduledDate.getTime() + durationMinutes * 60 * 1000);

    const { data: existingBookings } = await supabase
      .from('ta_bookings')
      .select('id, scheduled_at, duration')
      .eq('trainer_id', trainerId)
      .in('status', ['confirmed', 'soft-hold', 'checked-in'])
      .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString())
      .lte('scheduled_at', endTime.toISOString());

    for (const existing of existingBookings || []) {
      const existingStart = new Date(existing.scheduled_at);
      const existingEnd = new Date(existingStart.getTime() + existing.duration * 60 * 1000);

      if (scheduledDate < existingEnd && endTime > existingStart) {
        return { hasConflict: true, error: null };
      }
    }

    return { hasConflict: false, error: null };
  } catch (err) {
    return { hasConflict: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Fetch bookings for a user within optional date range and filters.
 */
export async function getBookings(params: {
  userId: string;
  studioId: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  clientId?: string | null;
}): Promise<{ data: unknown[] | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    // Clean up expired soft-holds before fetching bookings
    await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('status', 'soft-hold')
      .lt('hold_expiry', new Date().toISOString());

    let query = supabase
      .from('ta_bookings')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .or(`trainer_id.eq.${params.userId},studio_id.eq.${params.studioId}`)
      .order('scheduled_at', { ascending: true });

    if (params.startDate) {
      query = query.gte('scheduled_at', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('scheduled_at', params.endDate);
    }
    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.clientId) {
      query = query.eq('client_id', params.clientId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return { data: null, error: new Error(error.message) };
    }

    // Transform to include client name for convenience
    const transformedBookings = (bookings || []).map((booking: {
      client?: { first_name?: string | null; last_name?: string | null } | null;
      [key: string]: unknown;
    }) => ({
      ...booking,
      clientName: booking.client
        ? `${booking.client.first_name || ''} ${booking.client.last_name || ''}`.trim()
        : null,
    }));

    return { data: transformedBookings, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a new booking with conflict check, email confirmation, and reminder queueing.
 */
export async function createBooking(params: {
  studioId: string;
  userId: string;
  body: {
    trainerId?: string;
    trainer_id?: string;
    clientId?: string;
    client_id?: string;
    serviceId?: string;
    service_id?: string;
    scheduledAt?: string;
    scheduled_at?: string;
    duration: number;
    status?: string;
    holdExpiry?: string;
    hold_expiry?: string;
    sessionId?: string;
    session_id?: string;
    templateId?: string;
    template_id?: string;
    signOffMode?: string;
    sign_off_mode?: string;
    notes?: string;
  };
}): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const bookingData = {
      studio_id: params.studioId,
      trainer_id: params.body.trainerId || params.body.trainer_id || params.userId,
      client_id: params.body.clientId || params.body.client_id || null,
      service_id: params.body.serviceId || params.body.service_id || null,
      scheduled_at: params.body.scheduledAt || params.body.scheduled_at,
      duration: params.body.duration,
      status: params.body.status || 'confirmed',
      hold_expiry: params.body.holdExpiry || params.body.hold_expiry || null,
      session_id: params.body.sessionId || params.body.session_id || null,
      template_id: params.body.templateId || params.body.template_id || null,
      sign_off_mode: params.body.signOffMode || params.body.sign_off_mode || 'full_session',
      notes: params.body.notes || null,
    };

    // Fetch studio config for soft-hold length and opening hours validation
    const { data: studioConfig } = await getStudioConfig(bookingData.studio_id);

    // If it's a soft-hold, set expiry using studio config (fallback: 15 minutes)
    if (bookingData.status === 'soft-hold' && !bookingData.hold_expiry) {
      if (studioConfig?.soft_hold_length === null) {
        // soft holds disabled — auto-confirm instead
        bookingData.status = 'confirmed';
        bookingData.hold_expiry = null;
      } else {
        const holdMinutes = studioConfig?.soft_hold_length ?? 15;
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + holdMinutes);
        bookingData.hold_expiry = expiry.toISOString();
      }
    }

    // Validate against studio opening hours
    if (studioConfig?.opening_hours && bookingData.scheduled_at) {
      const hoursCheck = isWithinOpeningHours(
        studioConfig.opening_hours,
        bookingData.scheduled_at,
        bookingData.duration
      );
      if (!hoursCheck.valid) {
        return { data: null, error: new Error(hoursCheck.reason || 'Outside studio operating hours') };
      }
    }

    // Check for booking conflicts
    const { hasConflict } = await checkBookingConflicts(
      bookingData.trainer_id,
      bookingData.scheduled_at!,
      bookingData.duration
    );

    if (hasConflict) {
      return { data: null, error: new Error('Time slot conflict with existing booking') };
    }

    const { data, error } = await supabase
      .from('ta_bookings')
      .insert(bookingData)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      return { data: null, error: new Error(error.message) };
    }

    // Send booking confirmation email if booking is confirmed and has client
    if (data && data.status === 'confirmed' && data.client?.email) {
      try {
        const { data: trainer } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.trainer_id)
          .single();

        const trainerName = trainer
          ? `${trainer.first_name || ''} ${trainer.last_name || ''}`.trim() || 'Your Trainer'
          : 'Your Trainer';

        const clientName = data.client
          ? `${data.client.first_name || ''} ${data.client.last_name || ''}`.trim() || 'Client'
          : 'Client';

        await sendBookingConfirmationEmail({
          clientEmail: data.client.email,
          clientName,
          trainerName,
          serviceName: data.service?.name || 'Session',
          scheduledAt: data.scheduled_at,
          duration: data.duration,
          bookingId: data.id,
        });

        // Queue reminder emails
        const scheduledAt = new Date(data.scheduled_at);

        const templateData = {
          client_name: clientName,
          service_name: data.service?.name || 'Session',
          scheduled_at: data.scheduled_at,
          trainer_name: trainerName,
        };

        // 24-hour reminder
        const reminder24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000);
        if (reminder24h > new Date()) {
          await queueNotification({
            type: 'reminder_24h',
            recipientEmail: data.client.email,
            bookingId: data.id,
            clientId: data.client_id,
            scheduledFor: reminder24h,
            templateData,
          });
        }

        // 2-hour reminder
        const reminder2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000);
        if (reminder2h > new Date()) {
          await queueNotification({
            type: 'reminder_2h',
            recipientEmail: data.client.email,
            bookingId: data.id,
            clientId: data.client_id,
            scheduledFor: reminder2h,
            templateData,
          });
        }
      } catch (emailError) {
        console.error('Error sending booking confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Create a booking from the public booking page.
 * Handles service lookup, conflict check, multi-studio client resolution, and guest client creation.
 */
export async function createPublicBooking(params: {
  trainerId: string;
  serviceId: string;
  scheduledAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): Promise<{
  data: {
    bookingId: string;
    status: string;
    requiresPayment: boolean;
    priceCents: number;
    hasExistingAccount: boolean;
    clientId: string;
  } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Get service details
    const { data: service, error: serviceError } = await supabase
      .from('ta_services')
      .select('duration, price_cents, is_intro_session')
      .eq('id', params.serviceId)
      .eq('is_public', true)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return { data: null, error: new Error('Service not found or not available') };
    }

    // Get trainer's studio_id
    const { data: trainerStaff } = await supabase
      .from('bs_staff')
      .select('studio_id')
      .eq('id', params.trainerId)
      .single();

    const studioId = trainerStaff?.studio_id || null;

    // Fetch studio config for booking model, opening hours, and soft-hold length
    const publicStudioConfig = studioId ? (await getStudioConfig(studioId)).data : null;

    // Enforce booking model — trainer-led studios don't accept public bookings
    if (publicStudioConfig?.booking_model === 'trainer-led') {
      return {
        data: null,
        error: new Error('This studio does not accept online bookings. Please contact the studio directly.'),
      };
    }

    // Validate against studio opening hours
    if (publicStudioConfig?.opening_hours) {
      const hoursCheck = isWithinOpeningHours(
        publicStudioConfig.opening_hours,
        params.scheduledAt,
        service.duration
      );
      if (!hoursCheck.valid) {
        return { data: null, error: new Error(hoursCheck.reason || 'Outside studio operating hours') };
      }
    }

    // Check for conflicts
    const scheduledDate = new Date(params.scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + service.duration * 60 * 1000);

    const { data: conflicts } = await supabase
      .from('ta_bookings')
      .select('id')
      .eq('trainer_id', params.trainerId)
      .in('status', ['confirmed', 'soft-hold', 'checked-in'])
      .gte('scheduled_at', new Date(scheduledDate.getTime() - service.duration * 60 * 1000).toISOString())
      .lte('scheduled_at', params.scheduledAt);

    if (conflicts && conflicts.length > 0) {
      return { data: null, error: new Error('This time slot is no longer available') };
    }

    // Check if client exists with this specific studio
    let clientId: string;
    let isExistingAuthUser = false;

    const { data: existingClientForStudio } = await supabase
      .from('fc_clients')
      .select('id, is_guest')
      .eq('email', params.email.toLowerCase())
      .eq('studio_id', studioId)
      .maybeSingle();

    if (existingClientForStudio) {
      clientId = existingClientForStudio.id;
      isExistingAuthUser = !existingClientForStudio.is_guest;
    } else {
      const { data: existingClientOtherStudio } = await supabase
        .from('fc_clients')
        .select('id, is_guest, first_name, last_name')
        .eq('email', params.email.toLowerCase())
        .maybeSingle();

      if (existingClientOtherStudio && !existingClientOtherStudio.is_guest) {
        isExistingAuthUser = true;

        const { data: newClient, error: clientError } = await supabase
          .from('fc_clients')
          .insert({
            id: existingClientOtherStudio.id,
            first_name: existingClientOtherStudio.first_name || params.firstName,
            last_name: existingClientOtherStudio.last_name || params.lastName,
            name: `${existingClientOtherStudio.first_name || params.firstName} ${existingClientOtherStudio.last_name || params.lastName}`,
            email: params.email.toLowerCase(),
            phone: params.phone || null,
            is_guest: false,
            is_onboarded: true,
            source: 'public_booking',
            invited_by: params.trainerId,
            studio_id: studioId,
          })
          .select()
          .single();

        if (clientError) {
          console.warn('Could not create multi-studio client record:', clientError);
          clientId = existingClientOtherStudio.id;
        } else {
          clientId = newClient?.id || existingClientOtherStudio.id;
        }
      } else {
        const { data: newClient, error: clientError } = await supabase
          .from('fc_clients')
          .insert({
            first_name: params.firstName,
            last_name: params.lastName,
            name: `${params.firstName} ${params.lastName}`,
            email: params.email.toLowerCase(),
            phone: params.phone || null,
            is_guest: true,
            is_onboarded: true,
            source: 'public_booking',
            invited_by: params.trainerId,
            studio_id: studioId,
          })
          .select()
          .single();

        if (clientError || !newClient) {
          console.error('Error creating client:', clientError);
          return { data: null, error: new Error('Failed to create booking') };
        }
        clientId = newClient.id;
      }
    }

    // Create booking
    const isFree = !service.price_cents || service.price_cents === 0 || service.is_intro_session;

    let bookingStatus: string;
    let holdExpiry: string | null;

    if (isFree) {
      bookingStatus = 'confirmed';
      holdExpiry = null;
    } else if (publicStudioConfig?.soft_hold_length === null) {
      // Soft holds disabled — auto-confirm paid bookings too
      bookingStatus = 'confirmed';
      holdExpiry = null;
    } else {
      bookingStatus = 'soft-hold';
      const holdMinutes = publicStudioConfig?.soft_hold_length ?? 120; // default 2 hours for public
      holdExpiry = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();
    }

    const { data: booking, error: bookingError } = await supabase
      .from('ta_bookings')
      .insert({
        trainer_id: params.trainerId,
        client_id: clientId,
        service_id: params.serviceId,
        studio_id: studioId,
        scheduled_at: params.scheduledAt,
        duration: service.duration,
        status: bookingStatus,
        hold_expiry: holdExpiry,
        notes: `Booked via public page. Guest: ${params.firstName} ${params.lastName} (${params.email})`,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return { data: null, error: new Error('Failed to create booking') };
    }

    return {
      data: {
        bookingId: booking.id,
        status: bookingStatus,
        requiresPayment: !isFree,
        priceCents: service.price_cents,
        hasExistingAccount: isExistingAuthUser,
        clientId,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Complete a booking and optionally create a training session record.
 */
export async function completeBooking(
  bookingId: string,
  userId: string,
  sessionData?: {
    createSession?: boolean;
    templateId?: string;
    workoutId?: string;
    sessionName?: string;
    blocks?: unknown[];
    startedAt?: string;
    completedAt?: string;
    notes?: string;
  } | null
): Promise<{
  data: { booking: Record<string, unknown>; session: Record<string, unknown> | null } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    // Fetch the booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('ta_bookings')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError || !existingBooking) {
      return { data: null, error: new Error('Booking not found') };
    }

    // Only checked-in or confirmed bookings can be completed
    const validStatuses = ['checked-in', 'confirmed'];
    if (!validStatuses.includes(existingBooking.status)) {
      return { data: null, error: new Error(`Cannot complete booking with status '${existingBooking.status}'`) };
    }

    let createdSession = null;

    // If session data is provided, create a training session
    if (sessionData && sessionData.createSession !== false) {
      const sessionRecord = {
        trainer_id: existingBooking.trainer_id,
        client_id: existingBooking.client_id,
        template_id: existingBooking.template_id || sessionData.templateId || null,
        workout_id: sessionData.workoutId || existingBooking.template_id || null,
        session_name: sessionData.sessionName || 'Completed Session',
        json_definition: {
          blocks: sessionData.blocks || [],
          sign_off_mode: existingBooking.sign_off_mode || 'full_session',
        },
        started_at: sessionData.startedAt || existingBooking.scheduled_at,
        completed_at: sessionData.completedAt || new Date().toISOString(),
        notes: sessionData.notes || existingBooking.notes || null,
        completed: true,
        trainer_declaration: false,
      };

      const { data: session, error: sessionError } = await supabase
        .from('ta_sessions')
        .insert(sessionRecord)
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
      } else {
        createdSession = session;
      }
    }

    // Deduct credits for completed session
    const creditsRequired = existingBooking.service?.credits_required || 1;

    const { error: creditError } = await supabase.rpc(
      'deduct_client_credit',
      {
        p_client_id: existingBooking.client_id,
        p_trainer_id: existingBooking.trainer_id || userId,
        p_booking_id: bookingId,
        p_credits: creditsRequired,
      }
    );

    if (creditError) {
      console.error('Credit deduction failed:', creditError);
    }

    // Update booking to completed
    const updateData: Record<string, unknown> = {
      status: 'completed',
    };

    if (createdSession) {
      updateData.session_id = createdSession.id;
    }

    const { data, error } = await supabase
      .from('ta_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error completing booking:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { booking: data, session: createdSession }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ---------------------------------------------------------------------------
// Single-booking CRUD (extracted from api/bookings/[id]/route.ts)
// ---------------------------------------------------------------------------

/** Shared select string for booking queries with joins. */
const BOOKING_SELECT = `
  *,
  client:fc_clients(id, first_name, last_name, email, credits),
  service:ta_services(id, name, duration, color, credits_required)
`;

/**
 * Fetch a single booking by ID with client and service joins.
 */
export async function getBookingById(
  bookingId: string
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const { data: booking, error } = await supabase
      .from('ta_bookings')
      .select(BOOKING_SELECT)
      .eq('id', bookingId)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: booking, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Update a booking by ID.
 * Accepts a body with both camelCase and snake_case field names.
 */
export async function updateBooking(
  bookingId: string,
  input: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  try {
    const supabase = createServiceRoleClient();

    const updateData: Record<string, unknown> = {};

    if (input.clientId !== undefined || input.client_id !== undefined) {
      updateData.client_id = input.clientId ?? input.client_id;
    }
    if (input.serviceId !== undefined || input.service_id !== undefined) {
      updateData.service_id = input.serviceId ?? input.service_id;
    }
    if (input.scheduledAt !== undefined || input.scheduled_at !== undefined) {
      updateData.scheduled_at = input.scheduledAt ?? input.scheduled_at;
    }
    if (input.duration !== undefined) updateData.duration = input.duration;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.holdExpiry !== undefined || input.hold_expiry !== undefined) {
      updateData.hold_expiry = input.holdExpiry ?? input.hold_expiry;
    }
    if (input.sessionId !== undefined || input.session_id !== undefined) {
      updateData.session_id = input.sessionId ?? input.session_id;
    }
    if (input.templateId !== undefined || input.template_id !== undefined) {
      updateData.template_id = input.templateId ?? input.template_id;
    }
    if (input.signOffMode !== undefined || input.sign_off_mode !== undefined) {
      updateData.sign_off_mode = input.signOffMode ?? input.sign_off_mode;
    }
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('ta_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select(BOOKING_SELECT)
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete (hard) or cancel (soft) a booking by ID.
 */
export async function deleteBooking(
  bookingId: string,
  hardDelete: boolean
): Promise<{
  data: { success: boolean; booking?: Record<string, unknown> } | null;
  error: Error | null;
}> {
  try {
    const supabase = createServiceRoleClient();

    if (hardDelete) {
      const { error } = await supabase
        .from('ta_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        console.error('Error deleting booking:', error);
        return { data: null, error: new Error(error.message) };
      }

      return { data: { success: true }, error: null };
    }

    // Soft delete — set status to 'cancelled'
    const { data: booking, error } = await supabase
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling booking:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: { success: true, booking }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
