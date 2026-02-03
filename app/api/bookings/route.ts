import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { sendBookingConfirmationEmail, queueNotification } from '@/lib/notifications/email-service';

/**
 * GET /api/bookings
 * Fetches bookings for the authenticated trainer within a date range
 * Query params: startDate, endDate (ISO strings)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Clean up expired soft-holds before fetching bookings
    await serviceClient
      .from('ta_bookings')
      .update({ status: 'cancelled' })
      .eq('status', 'soft-hold')
      .lt('hold_expiry', new Date().toISOString());

    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');

    let query = serviceClient
      .from('ta_bookings')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .or(`trainer_id.eq.${user.id},studio_id.eq.${studioId}`)
      .order('scheduled_at', { ascending: true });

    if (startDate) {
      query = query.gte('scheduled_at', startDate);
    }
    if (endDate) {
      query = query.lte('scheduled_at', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: error.message },
        { status: 500 }
      );
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

    return NextResponse.json({ bookings: transformedBookings });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bookings
 * Creates a new booking
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const body = await request.json();

    // Validate required fields
    if (!body.scheduledAt && !body.scheduled_at) {
      return NextResponse.json(
        { error: 'scheduledAt is required' },
        { status: 400 }
      );
    }

    if (!body.duration) {
      return NextResponse.json(
        { error: 'duration is required' },
        { status: 400 }
      );
    }

    const bookingData = {
      studio_id: studioId,
      trainer_id: body.trainerId || body.trainer_id || user.id,
      client_id: body.clientId || body.client_id || null,
      service_id: body.serviceId || body.service_id || null,
      scheduled_at: body.scheduledAt || body.scheduled_at,
      duration: body.duration,
      status: body.status || 'confirmed',
      hold_expiry: body.holdExpiry || body.hold_expiry || null,
      session_id: body.sessionId || body.session_id || null,
      template_id: body.templateId || body.template_id || null,
      sign_off_mode: body.signOffMode || body.sign_off_mode || 'full_session',
      notes: body.notes || null,
    };

    // If it's a soft-hold, set expiry (15 minutes from now if not provided)
    if (bookingData.status === 'soft-hold' && !bookingData.hold_expiry) {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + 15);
      bookingData.hold_expiry = expiry.toISOString();
    }

    // Check for booking conflicts
    const scheduledDate = new Date(bookingData.scheduled_at);
    const endTime = new Date(scheduledDate.getTime() + bookingData.duration * 60 * 1000);

    const { data: existingBookings } = await serviceClient
      .from('ta_bookings')
      .select('id, scheduled_at, duration')
      .eq('trainer_id', bookingData.trainer_id)
      .in('status', ['confirmed', 'soft-hold', 'checked-in'])
      .gte('scheduled_at', new Date(scheduledDate.getTime() - 120 * 60 * 1000).toISOString())
      .lte('scheduled_at', endTime.toISOString());

    // Check for overlaps
    for (const existing of existingBookings || []) {
      const existingStart = new Date(existing.scheduled_at);
      const existingEnd = new Date(existingStart.getTime() + existing.duration * 60 * 1000);

      if (scheduledDate < existingEnd && endTime > existingStart) {
        return NextResponse.json(
          { error: 'Time slot conflict with existing booking' },
          { status: 409 }
        );
      }
    }

    const { data, error } = await serviceClient
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
      return NextResponse.json(
        { error: 'Failed to create booking', details: error.message },
        { status: 500 }
      );
    }

    // Send booking confirmation email if booking is confirmed and has client
    if (data && data.status === 'confirmed' && data.client?.email) {
      try {
        // Get trainer info
        const { data: trainer } = await serviceClient
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

        // Template data for notification emails
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

    return NextResponse.json({ booking: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/bookings
 * Updates a booking (reschedule, status change, etc.)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.clientId !== undefined || body.client_id !== undefined) {
      updateData.client_id = body.clientId || body.client_id;
    }
    if (body.serviceId !== undefined || body.service_id !== undefined) {
      updateData.service_id = body.serviceId || body.service_id;
    }
    if (body.scheduledAt !== undefined || body.scheduled_at !== undefined) {
      updateData.scheduled_at = body.scheduledAt || body.scheduled_at;
    }
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.holdExpiry !== undefined || body.hold_expiry !== undefined) {
      updateData.hold_expiry = body.holdExpiry || body.hold_expiry;
    }
    if (body.sessionId !== undefined || body.session_id !== undefined) {
      updateData.session_id = body.sessionId || body.session_id;
    }
    if (body.templateId !== undefined || body.template_id !== undefined) {
      updateData.template_id = body.templateId || body.template_id;
    }
    if (body.signOffMode !== undefined || body.sign_off_mode !== undefined) {
      updateData.sign_off_mode = body.signOffMode || body.sign_off_mode;
    }
    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await serviceClient
      .from('ta_bookings')
      .update(updateData)
      .eq('id', body.id)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.json(
        { error: 'Failed to update booking', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bookings
 * Cancels a booking (sets status to 'cancelled')
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!bookingId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    if (hardDelete) {
      // Actually delete the record
      const { error } = await serviceClient
        .from('ta_bookings')
        .delete()
        .eq('id', bookingId);

      if (error) {
        console.error('Error deleting booking:', error);
        return NextResponse.json(
          { error: 'Failed to delete booking', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    } else {
      // Soft delete - set status to 'cancelled'
      const { data, error } = await serviceClient
        .from('ta_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling booking:', error);
        return NextResponse.json(
          { error: 'Failed to cancel booking', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ booking: data, success: true });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
