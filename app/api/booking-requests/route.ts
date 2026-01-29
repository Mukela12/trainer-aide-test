import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';

/**
 * GET /api/booking-requests
 * Fetches pending booking requests for the authenticated trainer
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'accepted', 'declined', 'expired', or null for all

    let query = serviceClient
      .from('ta_booking_requests')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .or(`trainer_id.eq.${user.id},studio_id.eq.${studioId}`)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching booking requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch booking requests', details: error.message },
        { status: 500 }
      );
    }

    // Transform to include client name for convenience
    const transformedRequests = (requests || []).map((req: {
      client?: { first_name?: string | null; last_name?: string | null } | null;
      [key: string]: unknown;
    }) => ({
      ...req,
      clientName: req.client
        ? `${req.client.first_name || ''} ${req.client.last_name || ''}`.trim()
        : null,
    }));

    return NextResponse.json({ requests: transformedRequests });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/booking-requests
 * Creates a new booking request
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
    if (!body.clientId && !body.client_id) {
      return NextResponse.json(
        { error: 'clientId is required' },
        { status: 400 }
      );
    }

    if (!body.preferredTimes && !body.preferred_times) {
      return NextResponse.json(
        { error: 'preferredTimes is required' },
        { status: 400 }
      );
    }

    // Default expiry is 48 hours from now
    const defaultExpiry = new Date();
    defaultExpiry.setHours(defaultExpiry.getHours() + 48);

    const requestData = {
      studio_id: studioId,
      trainer_id: body.trainerId || body.trainer_id || user.id,
      client_id: body.clientId || body.client_id,
      service_id: body.serviceId || body.service_id || null,
      preferred_times: body.preferredTimes || body.preferred_times,
      notes: body.notes || null,
      status: 'pending',
      expires_at: body.expiresAt || body.expires_at || defaultExpiry.toISOString(),
    };

    const { data, error } = await serviceClient
      .from('ta_booking_requests')
      .insert(requestData)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error creating booking request:', error);
      return NextResponse.json(
        { error: 'Failed to create booking request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/booking-requests
 * Updates a booking request (accept/decline)
 */
export async function PUT(request: NextRequest) {
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

    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Fetch the existing request
    const { data: existingRequest, error: fetchError } = await serviceClient
      .from('ta_booking_requests')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .eq('id', body.id)
      .single();

    if (fetchError || !existingRequest) {
      return NextResponse.json(
        { error: 'Booking request not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    let createdBooking = null;

    // Handle accept action
    if (body.status === 'accepted') {
      if (!body.acceptedTime && !body.accepted_time) {
        return NextResponse.json(
          { error: 'acceptedTime is required when accepting a request' },
          { status: 400 }
        );
      }

      const acceptedTime = body.acceptedTime || body.accepted_time;

      // Create a booking for the accepted time
      const bookingData = {
        studio_id: studioId,
        trainer_id: existingRequest.trainer_id || user.id,
        client_id: existingRequest.client_id,
        service_id: existingRequest.service_id,
        scheduled_at: acceptedTime,
        duration: existingRequest.service?.duration || 60,
        status: 'confirmed',
        notes: existingRequest.notes,
      };

      const { data: booking, error: bookingError } = await serviceClient
        .from('ta_bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking from request:', bookingError);
        return NextResponse.json(
          { error: 'Failed to create booking', details: bookingError.message },
          { status: 500 }
        );
      }

      createdBooking = booking;
      updateData.status = 'accepted';
      updateData.accepted_time = acceptedTime;
      updateData.booking_id = booking.id;
    } else if (body.status === 'declined') {
      updateData.status = 'declined';
    } else if (body.status !== undefined) {
      updateData.status = body.status;
    }

    if (body.notes !== undefined) updateData.notes = body.notes;

    const { data, error } = await serviceClient
      .from('ta_booking_requests')
      .update(updateData)
      .eq('id', body.id)
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .single();

    if (error) {
      console.error('Error updating booking request:', error);
      return NextResponse.json(
        { error: 'Failed to update booking request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      request: data,
      booking: createdBooking,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/booking-requests
 * Deletes a booking request
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');

    if (!requestId) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { error } = await serviceClient
      .from('ta_booking_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('Error deleting booking request:', error);
      return NextResponse.json(
        { error: 'Failed to delete booking request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
