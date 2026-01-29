import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/bookings/[id]
 * Fetches a single booking by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceClient = createServiceRoleClient();

    const { data: booking, error } = await serviceClient
      .from('ta_bookings')
      .select(`
        *,
        client:fc_clients(id, first_name, last_name, email, credits),
        service:ta_services(id, name, duration, color, credits_required)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      return NextResponse.json(
        { error: 'Failed to fetch booking', details: error.message },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bookings/[id]
 * Updates a booking by ID
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const serviceClient = createServiceRoleClient();
    const body = await request.json();

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
      .eq('id', id)
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
 * DELETE /api/bookings/[id]
 * Cancels or deletes a booking by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    const serviceClient = createServiceRoleClient();

    if (hardDelete) {
      const { error } = await serviceClient
        .from('ta_bookings')
        .delete()
        .eq('id', id);

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
        .eq('id', id)
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
