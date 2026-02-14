import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { lookupUserProfile } from '@/lib/services/profile-service';
import { getBookings, createBooking } from '@/lib/services/booking-service';

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
    const profile = await lookupUserProfile(serviceClient, user);
    const studioId = profile?.studio_id || user.id;

    const { searchParams } = new URL(request.url);

    const { data: bookings, error } = await getBookings({
      userId: user.id,
      studioId,
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      status: searchParams.get('status'),
      clientId: searchParams.get('clientId'),
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings });
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

    const { data, error } = await createBooking({
      studioId,
      userId: user.id,
      body,
    });

    if (error) {
      const status = error.message.includes('conflict') ? 409 : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
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
